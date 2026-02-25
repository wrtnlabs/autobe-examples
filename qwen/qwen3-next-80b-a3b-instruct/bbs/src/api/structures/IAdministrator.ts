import { tags } from "typia";

export namespace IAdministrator {
  /**
   * A lightweight summary of an administrator user for audit and context display purposes. Contains essential identification and profile information without sensitive data or computed metrics.
   */
  export type ISummary = {
    /**
     * Unique identifier for the administrator account.
     *
     * @x-autobe-database-schema-property id
     */
    id: string & tags.Format<"uuid">;

    /**
     * Verified email address used for authentication.
     *
     * @x-autobe-database-schema-property email
     */
    email: string & tags.Format<"email">;

    /**
     * Public-facing name displayed in administrative actions and audit logs.
     *
     * @x-autobe-database-schema-property display_name
     * @x-autobe-specification Mapped from economic_board_administrators.display_name. Nullable as per database schema.
     */
    display_name?: string | null | undefined;

    /**
     * Optional short biography or introduction about the administrator.
     *
     * @x-autobe-database-schema-property bio
     * @x-autobe-specification Mapped from economic_board_administrators.bio. Nullable as per database schema.
     */
    bio?: string | null | undefined;

    /**
     * Timestamp when the administrator account was created, in ISO 8601 format.
     *
     * @x-autobe-database-schema-property created_at
     */
    created_at: string & tags.Format<"date-time">;

    /**
     * Timestamp of the last profile update, in ISO 8601 format.
     *
     * @x-autobe-database-schema-property updated_at
     */
    updated_at: string & tags.Format<"date-time">;
  };
}
