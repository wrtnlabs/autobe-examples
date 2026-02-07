import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IShoppingMallSeller {
  /**
   * Authentication response containing JWT access and refresh tokens for authenticated seller sessions. This schema is returned after successful join, login, or refresh operations and contains no user profile information to maintain separation of identity and data. The access token enables API access for 30 minutes, while the refresh token allows renewal of access tokens for up to 30 days.
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
   * Request for exchanging a valid refresh token for a new set of authentication tokens. Contains a single refresh_token string that was previously issued during seller login or refresh. This token has a 30-day lifetime and enables seamless session continuation without requiring re-authentication with email and password. Used exclusively by sellers to renew their short-lived access tokens. Never includes user profile, password, or session metadata.
   */
  export type IRefresh = {};

  /**
   * Request payload containing authentication credentials for seller login. Includes email address and plain-text password. The server will validate the email against the shopping_mall_sellers table, verify the password using BCrypt comparison with the stored password_hash, and check that the seller's approval_status is 'approved'. No profile or session data is included. This is a pure authentication request.
   */
  export type ILogin = {};

  /**
   * Request payload for registering a new seller account on the shoppingMall platform. Contains a valid email address and password. The email must be unique across all active seller accounts. The password must be at least 8 characters and will be securely hashed by the system. No profile or authentication metadata is included - these are handled server-side after registration.
   */
  export type IJoin = {};

  /**
   * Light-weight summary of seller account identity and status for pagination and listing views. Contains only essential identification and approval information for display in administrative interfaces. Used to populate seller lists on admin dashboards and management screens without exposing sensitive or internal data.
   */
  export type ISummary = {};
}
