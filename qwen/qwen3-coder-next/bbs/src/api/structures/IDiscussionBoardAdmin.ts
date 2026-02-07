import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardAdmin {
  /**
   * Authentication response containing authorized admin account information and JWT tokens for subsequent API requests.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for admin login authentication containing credentials needed to verify admin identity.
   */
  export type ILogin = {};

  /**
   * Request body for admin account registration. Contains credentials and profile information needed to create a new administrator account in the discussion board system.
   */
  export type IJoin = {};

  /**
   * Request body for administrator token refresh operation. Contains refresh token for obtaining new authentication tokens.
   */
  export type IRefresh = {};
}
