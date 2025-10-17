export namespace ITokenRefresh {
  /**
   * Token refresh request containing the refresh token for extending
   * authentication sessions.
   *
   * Used to obtain new access tokens and refresh tokens when the current
   * access token has expired.
   */
  export type IRequest = {
    /** JWT refresh token for requesting new authentication tokens */
    refresh: string;
  };
}
