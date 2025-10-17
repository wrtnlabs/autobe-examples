export namespace ICommunityPlatformAdminUserEmailResend {
  /**
   * Request body to re-send a verification email for an administrator
   * account.
   *
   * Exactly one identifying input is required: email or username. The
   * provider resolves the target using community_platform_users (email or
   * username) and, if email_verified is false, triggers a verification email
   * dispatch per policy. No Prisma columns are written by this request
   * itself; providers may update community_platform_users.updated_at for
   * audit. Responses should be neutral to prevent user enumeration.
   */
  export type ICreate = any | any;
}
