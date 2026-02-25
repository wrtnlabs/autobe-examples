import { tags } from "typia";

export namespace IShoppingMallSystemMigration {
  /**
   * Lightweight migration record for display in migration history listings. Includes identification, execution metadata, and integrity hash for tracking database schema changes.
   */
  export type ISummary = {
    /**
     * Primary key identifier for the migration record.
     *
     * @x-autobe-database-schema-property id
     * @x-autobe-specification Direct mapping from shopping_mall_system_migrations.id.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Name of the migration file or script that was executed.
     *
     * @x-autobe-database-schema-property migration_name
     * @x-autobe-specification Direct mapping from shopping_mall_system_migrations.migration_name.
     */
    migration_name: string;

    /**
     * Timestamp when this migration was executed in the database.
     *
     * @x-autobe-database-schema-property executed_at
     * @x-autobe-specification Direct mapping from shopping_mall_system_migrations.executed_at.
     */
    executed_at: string & tags.Format<"date-time">;

    /**
     * Hash of the migration file content for integrity verification.
     *
     * @x-autobe-database-schema-property migration_hash
     * @x-autobe-specification Direct mapping from shopping_mall_system_migrations.migration_hash.
     */
    migration_hash: string;

    /**
     * Administrator who executed this migration (shopping_mall_admins.id).
     *
     * @x-autobe-database-schema-property admin_id
     * @x-autobe-specification Direct mapping from shopping_mall_system_migrations.admin_id.
     */
    admin_id: string & tags.Format<"uuid">;
  };

  /**
   * Request parameters for querying migration history with pagination and filtering support.
   */
  export type IRequest = {
    /**
     * Search term to filter migrations by migration name (partial match)
     *
     * @x-autobe-specification Search term for filtering migrations by migration name (partial match). Case-insensitive substring matching.
     */
    search?: string | undefined;

    /**
     * Start date for filtering migrations by execution date (inclusive)
     *
     * @x-autobe-specification Start date for filtering migrations by execution date (inclusive). Filter migrated records with executed_at >= startedAt.
     */
    startedAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * End date for filtering migrations by execution date (inclusive)
     *
     * @x-autobe-specification End date for filtering migrations by execution date (inclusive). Filter migrated records with executed_at <= endedAt.
     */
    endedAt?: (string & tags.Format<"date-time">) | undefined;

    /**
     * Page number for pagination (1-based)
     *
     * @x-autobe-specification Page number for pagination (1-based). Defaults to 1. Used for cursor-based pagination.
     */
    page: number & tags.Type<"int32"> & tags.Default<1> & tags.Minimum<1>;

    /**
     * Number of items per page
     *
     * @x-autobe-specification Number of items per page. Minimum 1, maximum 100, defaults to 20. Controls pagination page size.
     */
    limit: number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>;
  };
}
