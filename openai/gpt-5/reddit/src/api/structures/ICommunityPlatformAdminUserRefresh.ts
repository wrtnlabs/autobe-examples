export namespace ICommunityPlatformAdminUserRefresh {
  /** Administrator refresh request payload. */
  export type ICreate = {
    /** Refresh token to renew admin session. */
    refresh_token: string;
  };
}
