import { tags } from "typia";

export namespace ICommunityPlatformAdminUserLogin {
  /**
   * Administrator login request supporting exactly one of two credential
   * forms.
   *
   * Use email + password (ICommunityPlatformAdminUserLogin.IByEmail) or
   * username + password (ICommunityPlatformAdminUserLogin.IByUsername). Both
   * variants are validated against Actors.community_platform_users:
   * email/username for lookup and password_hash for server-side verification.
   * No plaintext credentials are persisted.
   *
   * Security note: This DTO is for authentication requests only. Do not
   * include identity fields (id) or system timestamps (created_at/updated_at)
   * in requests. Password hashing is strictly a backend responsibility.
   */
  export type ICreate =
    | ICommunityPlatformAdminUserLogin.IByEmail
    | ICommunityPlatformAdminUserLogin.IByUsername;

  /**
   * Login payload variant for administrators using email + password.
   *
   * This request DTO aligns to Actors.community_platform_users columns: email
   * (unique identifier) and password_hash (server-side verification only).
   */
  export type IByEmail = {
    /**
     * Administrator’s email address.
     *
     * Maps to Prisma column community_platform_users.email, which is unique
     * and used for authentication lookup.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted by the client.
     *
     * Server compares the provided value to
     * community_platform_users.password_hash after hashing, per security
     * policy.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<64>;
  };

  /**
   * Login payload variant for administrators using username + password.
   *
   * This DTO is used only for request input and does not correspond directly
   * to a single Prisma row; however, its properties are validated against the
   * Actors schema columns (community_platform_users.username and
   * community_platform_users.password_hash).
   */
  export type IByUsername = {
    /**
     * Username uniquely identifying the administrator account.
     *
     * This maps to Prisma model column community_platform_users.username,
     * which is unique and used for public handle and authentication
     * lookup.
     */
    username: string;

    /**
     * Plaintext password submitted by the client for verification.
     *
     * Server verifies against community_platform_users.password_hash and
     * never stores plaintext. Clients MUST NOT send pre-hashed values;
     * hashing is performed by the backend.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<64>;
  };
}
