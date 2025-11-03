import { tags } from "typia";

export namespace ITodoAppAdminBackup {
  /**
   * Request body for backup restoration operation. Contains the confirmation
   * from the admin that they understand the consequences of restoration (all
   * current data will be overwritten) and the reason for performing this
   * sensitive operation.
   *
   * Restoration is a destructive operation that will overwrite all current
   * application data with the backed-up version, rolling back any changes
   * made after the backup was created. The confirmation phrase requirement
   * ensures the admin has explicitly confirmed they understand this
   * consequence.
   *
   * The reason field provides audit trail documentation of why the
   * restoration was performed, supporting compliance requirements and future
   * incident investigations.
   */
  export type IRestore = {
    /**
     * Admin's explicit confirmation phrase to verify they understand the
     * destructive nature of backup restoration. Must match the expected
     * confirmation phrase (typically 'CONFIRM') to proceed with
     * restoration. This prevents accidental data loss due to misclicked
     * buttons.
     *
     * The admin must type this exact phrase in the confirmation dialog,
     * demonstrating they have read and understood the warning about data
     * loss. Any changes made to the application after the backup timestamp
     * will be permanently lost and replaced with the backed-up versions.
     */
    confirmation_phrase: string;

    /**
     * Admin's explanation of why this backup restoration is necessary. Used
     * for audit trail documentation and compliance purposes. Examples:
     * 'Data corruption detected in production', 'Recovering from ransomware
     * attack', 'Rolling back erroneous configuration change'.
     *
     * This reason is recorded in the admin audit trail along with the
     * restoration action for future reference and accountability.
     */
    reason?: string | undefined;
  };

  /**
   * Response body confirming successful backup restoration with detailed
   * information about what was restored. Indicates that the Todo application
   * has been restored to the point-in-time state captured in the backup.
   *
   * The restoration operation has completed and all data (users, todos, audit
   * logs) have been written to the production database. The system is now
   * operating with the backed-up state. All users will see the application as
   * it existed at the restored_timestamp.
   *
   * Users will need to log in again after the restoration, as all sessions
   * are invalidated during the restoration process. The restoration action is
   * logged in the admin audit trail with full details for compliance and
   * security purposes.
   */
  export type IRestoreResult = {
    /**
     * Boolean indicating whether the backup restoration operation completed
     * successfully. True means the backup has been fully restored and the
     * system is now running with the backed-up state. False indicates the
     * restoration failed partway through, though the system attempts to
     * ensure atomicity so partial restores do not occur.
     */
    success: boolean;

    /**
     * Unique identifier of the backup that was restored. References the
     * backup snapshot used for this restoration operation. Enables auditing
     * which backup version was restored.
     */
    backup_id: string & tags.Format<"uuid">;

    /**
     * Timestamp in UTC ISO 8601 format indicating the point-in-time state
     * that the system has been restored to. This is the created_at
     * timestamp from the selected backup. All application data now reflects
     * the state as it existed at this timestamp.
     */
    restored_timestamp: string & tags.Format<"date-time">;

    /**
     * Timestamp in UTC ISO 8601 format when the restoration operation
     * completed. Indicates when the system finished writing the backed-up
     * data to the production database and became available with the
     * restored state.
     */
    restoration_completed_at: string & tags.Format<"date-time">;

    /**
     * Number of user accounts included in the restoration. Indicates how
     * many user records were restored from the backup. Users will need to
     * log in again after restoration completes.
     */
    users_restored: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Number of todo items included in the restoration. Indicates how many
     * task items were restored from the backup. Todos will revert to their
     * state at the backup timestamp.
     */
    todos_restored: number & tags.Type<"int32"> & tags.Minimum<0>;

    /**
     * Human-readable message describing the restoration result. Examples:
     * 'Backup restoration completed successfully. System restored to
     * 2024-10-31 14:00:00 UTC. All users have been logged out and must log
     * in again.' or 'Backup restoration completed with warnings. Some audit
     * logs could not be fully restored.'.
     *
     * Provides additional context about the restoration operation and any
     * notable conditions or side effects.
     */
    message: string;
  };
}
