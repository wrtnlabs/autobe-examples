import { tags } from "typia";

export namespace ICommunityPlatformCommunityModeratorLogin {
  /**
   * Login-by-email variant for community moderator authentication.
   *
   * This DTO is used when authenticating with community_platform_users.email
   * and a password. It complements the username-based variant and is
   * referenced by the union request type. Only request-time plaintext is
   * allowed; the server compares against password_hash and never persists the
   * plaintext.
   */
  export type IByEmail = {
    /**
     * Login identifier using the user’s email address.
     *
     * Maps to community_platform_users.email (unique). The Prisma model
     * enforces uniqueness at the database layer; application logic should
     * treat comparison case-insensitively and validate syntactic
     * correctness via this email format.
     */
    email: string & tags.Format<"email">;

    /**
     * Plaintext password submitted by the client for verification.
     *
     * Backends MUST compare a derived hash to
     * community_platform_users.password_hash and MUST NEVER store this
     * plaintext value. Strength rules follow the Authentication
     * requirements (8–64 characters).
     */
    password: string & tags.MinLength<8> & tags.MaxLength<64>;
  };

  /**
   * Login-by-username variant for community moderator authentication.
   *
   * This shape is valid when authenticating with
   * community_platform_users.username and a password. It is referenced by the
   * union request type.
   */
  export type IByUsername = {
    /**
     * Platform username used to locate the account.
     *
     * Maps to community_platform_users.username (unique). The Prisma schema
     * recommends case-insensitive uniqueness; concrete character rules are
     * enforced by application policy.
     */
    username: string & tags.MinLength<3> & tags.MaxLength<64>;

    /**
     * Plaintext password provided by the client for verification.
     *
     * Backends MUST compare its hash to
     * community_platform_users.password_hash and MUST NEVER store the
     * plaintext value. Enforce 8–64 characters per Authentication
     * requirements.
     */
    password: string & tags.MinLength<8> & tags.MaxLength<64>;
  };

  /**
   * Union request type for community moderator login supporting either
   * email+password or username+password.
   *
   * This schema references only named object types (no inline definitions) to
   * comply with the naming rules. Clients must provide exactly one of the
   * supported shapes.
   */
  export type IRequest =
    | ICommunityPlatformCommunityModeratorLogin.IByEmail
    | ICommunityPlatformCommunityModeratorLogin.IByUsername;
}
