import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityGuest {
  /**
   * Registration credentials for new guest account. Requires valid email, strong password (min 8 characters), and unique username to trigger email verification process.
   */
  export type IJoin = {
    /**
     * User's email address for login and identity verification.
     *
     * @x-autobe-specification Email format validation using RFC 5322 regex. Must pass uniqueness check against email verification tokens in community_member_email_verifications table.
     */
    email: string & tags.Format<"email">;

    /**
     * User's password (will be hashed server-side; never stored or returned in plaintext).
     *
     * @x-autobe-specification Password strength enforcement (8+ characters, mixed case, numeric) with server-side bcrypt hashing. Validation happens before database insertion.
     */
    password: string & tags.MinLength<8>;

    /**
     * User's chosen username (3-50 characters, unique across all community members).
     *
     * @x-autobe-specification Username must be 3-50 characters unique across community members. Validation uses external lookup tables.
     */
    username: string & tags.MinLength<3>;
  };

  /**
   * JWT refresh token required to renew guest session authentication without user re-authentication.
   */
  export type IRefresh = {
    /**
     * The secret token used to refresh guest sessions without requiring re-authentication.
     *
     * @x-autobe-specification Refresh token is a computed value from authentication session processing, not directly stored as a database column. Represents the JWT refresh token string used for session renewal.
     */
    refreshToken: string & tags.Format<"uuid">;
  };

  /**
   * Authorization response object for guest accounts after successful registration. Contains guest identifier and token credentials for session management with known lifespan limitations, enabling access to guest-only features.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the guest account, derived from community_guests.id.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Maps guest ID from community_guests table. This is the primary key of the guest account.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };
}
