export namespace ICommunityPlatformCommunityModeratorRefresh {
  /** Community moderator refresh request payload. */
  export type IRequest = {
    /** Refresh token to renew moderator session. */
    refresh_token: string;
  };
}
