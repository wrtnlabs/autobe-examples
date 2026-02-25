export namespace IDiscussionBoardAdministrator {
  /**
   * Request body for demoting a super administrator to regular administrator status. Contains an optional reason field for documenting the demotion justification. The target administrator is specified via the path parameter, and the actor is resolved from authentication.
   */
  export type IDemote = {
    /**
     * Optional justification for the demotion action. May contain explanation of why the super administrator is being demoted to regular administrator status. Can be null if no reason is provided.
     *
     * @x-autobe-database-schema-property reason
     * @x-autobe-specification Direct mapping from request body to discussion_board_admin_hierarchy_actions.reason. Nullable string field (no max length constraint in DB) for documenting the demotion justification. Stored as-is in the audit trail record.
     */
    reason?: string | null | undefined;
  };
}
