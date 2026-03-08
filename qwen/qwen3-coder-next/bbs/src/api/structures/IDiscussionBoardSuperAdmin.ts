import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardSuperAdmin {
  /**
   * Request body for super admin authentication during login. Contains email address and password for authentication purposes.
   */
  export type ILogin = {
    /**
     * Super admin email address for authentication
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from discussion_board_super_admins.email. Used for authentication lookup.
     */
    email: string & tags.Format<"email">;

    /**
     * Plain text password for authentication (server hashes with bcrypt)
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to discussion_board_super_admins.password_hash via bcrypt hash verification. Password is sent as plain text and hashed server-side using bcrypt.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Authentication response with JWT tokens for super admin access.
   */
  export type IAuthorized = {
    /**
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;
    /**
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;
    /**
     * @x-autobe-database-schema-property display_name
     */
    display_name: string | null;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
    authorizationActor: "superAdmin";
  };

  /**
   * Registration request body for super admin account.
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;
    /**
     * @x-autobe-database-schema-property password_hash
     */
    password: string & tags.Format<"password">;

    /**
     * Optional display name for UI presentation.
     *
     * @x-autobe-database-schema-property display_name
     */
    display_name?: (string & tags.MaxLength<100>) | null | undefined;

    /**
     * Optional biography text.
     *
     * @x-autobe-database-schema-property bio
     */
    bio?: string | null | undefined;

    /**
     * The page URL where the user landed after authentication.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring page that directed the user to the application.
     */
    referrer: string & tags.Format<"uri">;
  };

  /**
   * Request body for refreshing super admin authentication tokens using a valid refresh token.
   */
  export type IRefresh = {
    /**
     * JWT refresh token for authentication session renewal
     *
     * @x-autobe-specification JWT refresh token. Maps to refresh_token field in session table or from JWT token payload. Used to validate token and verify session authenticity.
     */
    refresh_token: string;
  };

  /**
   * Summary view of a super administrator with essential identification information. Used when super admin details are needed in API responses without exposing sensitive information.
   */
  export type ISummary = {
    /**
     * Unique identifier for the super administrator.
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Super administrator's email address for authentication.
     *
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;

    /**
     * Super administrator's display name for UI presentation.
     *
     * @x-autobe-database-schema-property display_name
     */
    display_name: string | null;

    /**
     * Super administrator's biography or description.
     *
     * @x-autobe-database-schema-property bio
     */
    bio: string | null;
  };
}
