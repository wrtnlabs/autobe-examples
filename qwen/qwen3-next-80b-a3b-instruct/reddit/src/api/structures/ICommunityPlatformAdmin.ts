import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformAdmin {
  /**
   * Authentication response for platform administrators following successful
   * registration (join), login, or token refresh operations. This object
   * encapsulates the essential information needed by the client to
   * authenticate with the platform and maintain an active session.
   *
   * The response contains two critical components:
   *
   * 1. The unique identifier (id) of the authenticated administrator account,
   *    which maps directly to the database's community_platform_admin table
   * 2. An authentication token object (token) containing both access and refresh
   *    tokens necessary for subsequent authenticated requests
   *
   * This structure represents the platform's unified authentication response
   * pattern, where all actor types (admin, moderator, member) use identical
   * response formats when successfully authenticating.
   *
   * Security considerations:
   *
   * - This object is only returned over HTTPS connections
   * - The access and refresh tokens are never exposed in logging or debugging
   *   output
   * - The response body contains no sensitive information beyond the tokens
   *   themselves
   * - Tokens are issued server-side as JWTs with cryptographic signatures
   * - Client-side storage of tokens must implement appropriate security
   *   practices
   * - The refresh token mechanism enables secure long-term session management
   * - The absence of password values or hashes in this response ensures no
   *   credential leakage
   *
   * The id field is a UUID that links directly to the user record, while the
   * token field contains the cryptographic credentials that prove
   * authentication. Together, they enable stateless authentication across
   * distributed systems while maintaining the security of platform
   * administrator accounts.
   *
   * Note: The client application is responsible for securely storing the
   * returned token(s) and including them in the Authorization header for
   * subsequent requests.
   *
   * Example: { "id": "aa11bb22-cc33-dd44-ee55-ff6677889900", "token": {
   * "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "refreshToken":
   * "7a2b3d4e5f6a7b8c9d0e1f2a3b4c5d6e...", "expiresAt":
   * "2024-12-05T14:20:00Z", "refreshExpiresAt": "2024-12-12T14:20:00Z",
   * "tokenType": "Bearer" } }
   *
   * This design pattern ensures security, scalability, and consistency across
   * the platform's authentication system.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the newly created or authenticated platform
     * administrator account. This UUID reference corresponds directly to
     * the id field in the community_platform_admin table, ensuring a direct
     * mapping between the authentication session and the administrative
     * account record in the database.
     *
     * This identifier is critical for the platform's authorization system,
     * as it is embedded within the JWT access token payload and used to
     * verify administrator identity on subsequent requests. It enables the
     * system to enforce role-based access controls, auditing of
     * administrative actions, and session management.
     *
     * The format is a UUID (Universally Unique Identifier) as specified in
     * RFC 4122, ensuring global uniqueness. This UUID is generated
     * server-side during account creation and never changes for the
     * lifetime of the account.
     *
     * This field must NOT be included in any request bodies for
     * authentication operations, as it is generated and managed entirely by
     * the server. Clients only receive this value as part of the
     * authentication response.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };
}
