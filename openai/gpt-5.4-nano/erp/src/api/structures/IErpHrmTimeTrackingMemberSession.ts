import { tags } from "typia";

export namespace IErpHrmTimeTrackingMemberSession {
  /**
   * Request payload used by an authenticated member to switch the active organization context for subsequent organization-scoped operations. The server updates the organization_id of the member’s currently active timer session to establish tenant scoping for later authorization checks.
   */
  export type IUpdate = {
    /**
     * The target organization (tenant) identifier that the server should use as the active context for subsequent organization-scoped authorization and data operations.
     *
         * @x-autobe-database-schema-property organization_id
         * @x-autobe-specification Direct mapping: set
         *   erp_hrm_time_tracking_timer_sessions.organization_id to the
         *   provided IErpHrmTimeTrackingSession.IUpdate.organization_id for the
         *   caller’s currently active timer session. Validate
         *   access/eligibility for the target organization before persisting.
         *   Update only organization_id; do not change other columns
         *   (description/started_at/ended_at/is_active/timestamps) beyond
         *   standard updated_at behavior.
     */
    organization_id: string & tags.Format<"uuid">;
  };
}
