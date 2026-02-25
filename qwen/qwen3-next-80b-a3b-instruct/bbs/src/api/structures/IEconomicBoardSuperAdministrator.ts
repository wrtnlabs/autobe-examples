import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IEconomicBoardSuperAdministrator {
  /**
   * Authentication request payload for super administrator login. Provides the email identifier and plaintext password to initiate the authentication flow. Server validates email existence, verifies password hash using bcrypt, and issues tokens upon success. This schema excludes all session, metadata, or device-related fields for maximum security and minimal attack surface.
   */
  export type ILogin = {
    /**
     * The email address used for superAdministrator authentication.
     *
     * @x-autobe-specification The email field is used for authentication against the system's user registry, not directly from economic_board_super_administrators. It is validated against the email column in the citizens or administrators table. This is a computed field based on external identity lookup.
     */
    email: string & tags.Format<"email">;

    /**
     * The plaintext password used for authenticating the superAdministrator account.
     *
     * @x-autobe-specification The password is received in plaintext for verification against the bcrypt hash stored in the citizens table or administrators table during login. This field is not stored in economic_board_super_administrators and is only used transiently for authentication.
     */
    password: string;
  };

  /**
   * Empty request body for the superAdministrator token refresh endpoint. The refresh token is securely stored and transmitted via an httpOnly, Secure cookie. No data is required in the request body.
   */
  export type IRefresh = {};

  /**
   * Authentication response containing the user identity and token credentials for superAdministrator session.
   */
  export type IAuthorized = {
    /**
     * Unique identifier for the superAdministrator user account.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from economic_board_super_administrators.id. Unique identifier for the superAdministrator user account.
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
   * Registration payload for creating a new superAdministrator account. Must include a valid email address and a secure password for authentication. The provided email and password are not stored directly in the database; instead, they trigger creation of a new superAdministrator record with a generated id and encrypted credentials in a secure, separate storage layer.
   */
  export type IJoin = {
    /**
     * The registered user's email address. Must be unique and valid per RFC 5322. Used to create a secure credential record; not directly stored in the economic_board_super_administrators table.
     *
     * @x-autobe-specification Email is validated for uniqueness and used as a key to associate with a new superAdministrator record. The email itself is persisted in a credential store (e.g., economic_board_super_administrator_password_resets) linked to the generated id, not in economic_board_super_administrators.
     */
    email: string & tags.Format<"email">;

    /**
     * The user's plaintext password. Must meet minimum security requirements (e.g., 12 characters). Will be hashed with bcrypt and stored in a secure authentication table—never stored directly in economic_board_super_administrators.
     *
     * @x-autobe-specification Password is validated for security requirements (minimum 12 chars) and transformed using bcrypt (cost 12). The hash is stored in a secure, non-exposed credential table (e.g., economic_board_super_administrator_password_resets) associated with the generated id. Original plaintext password is discarded immediately after hashing.
     */
    password: string;
  };
}
