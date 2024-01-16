import { mutation } from "./functions";
import { getRole } from "./permissions";
import { getUniqueSlug } from "./users/teams";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const existingUser = await ctx
      .table("users")
      .get("tokenIdentifier", identity.tokenIdentifier);
    if (existingUser !== null) {
      return;
    }
    if (identity.email === undefined) {
      throw new Error("User does not have an email address");
    }
    const nameFallback = emailUserName(identity.email);
    const user = await ctx
      .table("users")
      .insert({
        fullName: identity.name ?? nameFallback,
        tokenIdentifier: identity.tokenIdentifier,
        email: identity.email,
        pictureUrl: identity.pictureUrl,
        firstName: identity.givenName,
        lastName: identity.familyName,
      })
      .get();
    const name = `${user.firstName ?? nameFallback}'s Team`;
    const slug = await getUniqueSlug(ctx, identity.nickname ?? name);
    const teamId = await ctx.table("teams").insert({
      name,
      slug,
      isPersonal: true,
    });
    await ctx.table("members").insert({
      teamId: teamId,
      userId: user._id,
      roleId: (await getRole(ctx, "Admin"))._id,
    });
  },
});

function emailUserName(email: string) {
  return email.split("@")[0];
}
