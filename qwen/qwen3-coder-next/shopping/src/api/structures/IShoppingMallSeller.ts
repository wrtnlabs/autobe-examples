import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSeller {
  /**
   * Refresh token for renewing expired access tokens. This long-lived token allows sellers to maintain authenticated sessions without re-entering credentials.
   */
  export type IRefresh = {};

  /**
   * Seller authentication response containing JWT tokens for secure session management.
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
   * Request body for seller login authentication containing email address and plaintext password.
   */
  export type ILogin = {};

  /**
   * Seller registration request containing authentication credentials and shop profile information for creating new seller accounts in the shopping mall platform.
   */
  export type IJoin = {};
}
