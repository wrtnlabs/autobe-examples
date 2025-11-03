export namespace IGuest {
  /**
   * Request data for guest user join operation creating a temporary session
   * and JWT tokens.
   */
  export type IJoin = {};

  /**
   * Request DTO for refreshing JWT access tokens for guest actor sessions.
   * Contains the refresh token string issued to the guest.
   */
  export type IRefresh = {
    /**
     * Refresh token issued previously to guest session. Client submits this
     * token to get new access and refresh tokens.
     */
    refresh_token: string;
  };
}
