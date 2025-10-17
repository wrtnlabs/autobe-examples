export namespace ICommunityPlatformAdminUserEmailVerify {
  /** Administrator email verification payload. */
  export type ICreate = {
    /** One-time email verification artifact. */
    verification_token: string;
  };
}
