import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformGuest {
  /**
   * Request body structure for creating an ephemeral anonymous session. This schema is used when guest users access public resources without authentication. No fields are required as the server generates a temporary session token based on connection context without any client-provided information.
   */
  export type IJoin = {};

  /**
   * Temporary authentication token and session expiration for anonymous guest access. This schema is returned after successful guest join or refresh operations and contains the token needed to authenticate subsequent requests during the guest session. No personal user data is included as guests maintain anonymous identity.
   */
  export type IAuthorized = {
    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;

    /**
     * ISO 8601 timestamp indicating when the guest access token expires and becomes invalid. After this time, the token will be rejected by authenticated endpoints. Clients should proactively request token refresh before this expiration to maintain seamless access. The expiration is determined server-side based on security policies for anonymous guest sessions.
     *
     * @x-autobe-specification The token expiration is derived from server-side session management logic and stored as an ISO 8601 timestamp. This is generated upon token creation based on configurable session lifetime settings (typically 24-48 hours for guest sessions). No database column - calculated server-side.
     */
    sessionExpiration: string & tags.Format<"date-time">;
  };

  /**
   * Request body schema for refreshing ephemeral guest session tokens. This schema is intentionally empty as the guest session token is stored in the Authorization header as a JWT. The request body serves as a signaling mechanism to trigger token refresh without requiring any authentication data in the body. This design ensures anonymous guests can extend their session access without transmitting additional credentials.
   */
  export type IRefresh = {};
}
