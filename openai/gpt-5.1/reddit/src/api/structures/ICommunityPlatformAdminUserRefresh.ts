export namespace ICommunityPlatformAdminUserRefresh {
  /**
   * Refresh request payload for renewing JWT tokens of an already
   * authenticated adminUser using a previously issued refresh token. This DTO
   * does not contain credentials and is used to extend an existing admin
   * session without re-supplying username or password.
   */
  export type IRequest = {
    /**
     * Previously issued refresh token representing an existing adminUser
     * session. The server validates this token, loads the corresponding
     * adminUser record from community_platform_adminusers, and checks
     * account state before issuing new JWT tokens.
     */
    refreshToken: string;
  };
}
