import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IDiscussionBoardAdmin {
  /**
   * Authorization response for admin authentication operations containing admin identity and JWT tokens for authenticated sessions.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated admin user.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_admins.id. Unique admin identifier.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for admin authentication refresh containing the refresh token.
   */
  export type IRefresh = {
    /**
     * The refresh token obtained during login used to obtain new access and refresh tokens.
     *
     * @x-autobe-specification Refresh token for JWT authentication. Used to obtain new access and refresh tokens without re-authentication.
     */
    refresh_token: string;
  };

  /**
   * Admin login request containing email address and password for authentication.
   */
  export type ILogin = {
    /**
     * Admin email address for login.
     *
     * @x-autobe-database-schema-property email
     * @x-autobe-specification Direct mapping from discussion_board_admins.email. Used for admin authentication.
     */
    email: string;

    /**
     * Admin password for authentication.
     *
     * @x-autobe-database-schema-property password_hash
     * @x-autobe-specification Maps to discussion_board_admins.password_hash. Plain text password provided by admin, verified against stored hash.
     */
    password: string & tags.Format<"password">;
  };

  /**
   * Request body for registering a new administrator account. Contains authentication credentials and profile information needed to create a new admin user in the system.
   */
  export type IJoin = {
    /**
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;
    /**
     * @x-autobe-database-schema-property password_hash
     */
    password: string & tags.MinLength<8> & tags.Format<"password">;
    /**
     * @x-autobe-database-schema-property display_name
     */
    display_name: string & tags.MinLength<1> & tags.MaxLength<100>;

    /**
     * Optional biography text for admin profile.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Direct mapping from discussion_board_admins.bio. Optional biography text.
     */
    bio?: string | null | undefined;
  };

  /**
   * Summary view of an administrator with essential identifying information including unique identifier, display name, and role type.
   */
  export type ISummary = {
    /**
     * Unique administrator identifier.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from discussion_board_admins.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Administrator's display name for content attribution.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Direct mapping from discussion_board_admins.display_name.
     */
    display_name: string;

    /**
     * Administrator role type: 'admin' for regular administrator, 'super_admin' for super administrator with elevated privileges.
     *
     * @x-autobe-database-schema-property role
     * @x-autobe-specification Direct mapping from discussion_board_admins.role.
     */
    role: "admin" | "super_admin";
  };
}
