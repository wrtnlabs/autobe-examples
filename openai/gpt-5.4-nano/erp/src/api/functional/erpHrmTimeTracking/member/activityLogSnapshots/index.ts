import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "../../../../structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import { IPageIErpHrmTimeTrackingActivityLogEntrySnapshot } from "../../../../structures/IPageIErpHrmTimeTrackingActivityLogEntrySnapshot";

export * as targetEntities from "./targetEntities/index";

/**
 * Search and retrieve activity log entry snapshots using complex filter criteria.
 *
 * This endpoint allows users to browse historical audit log snapshots as a paginated list. Activity log snapshots preserve point-in-time information about {@link erp_hrm_time_tracking_activity_log_entries} so that audit trails remain queryable even if related domain entities change later. Each snapshot row is stored in {@link erp_hrm_time_tracking_activity_log_entry_snapshots} with organization ownership via `erp_hrm_time_tracking_activity_log_entry_snapshots.erp_hrm_time_tracking_organization_id`.
 *
 * The search operation is intended for list browsing scenarios described in the requirements: the system must support filtering activity logs by action type, performer user, and date range, and must return only entries matching all selected filter criteria. Filtering must be applied within the currently selected organization context so that results never expose entries from other organizations. If the filter combination yields no matches, the API must return an empty result set rather than an error.
 *
 * Security and authorization: access is restricted by organization permissions. Users without org:manage capability cannot view the full activity log; the implementation must apply the permissions rule when determining whether to allow all entries or restrict the view. In all cases, returned snapshots must be scoped to the selected organization.
 *
 * Data mapping: filters are matched against snapshot-level columns such as `snapshot_action_type`, `snapshot_action_summary`, `performer_type`, `performer_id`, `target_entity_type`, `target_entity_id`, and `created_at` (and any other snapshot-filterable columns that are defined by the DTO schema). The underlying audit log entry timestamps and actor/action taxonomy are represented by `action_type` / `performed_by_member_id` and the snapshot timestamp (`created_at`), and indexing in the schema is designed to support these queries (e.g., organization_id + created_at, performer_id, target_entity_type + target_entity_id, action_type + occurred_at on the base log entries).
 *
 * Pagination, sorting, and stable results: the implementation must apply pagination and sorting based on the request body. It must avoid cross-organization results and ensure that changing filters yields results consistent with the active filter set.
 *
 * @param props.connection
 * @param props.body Search criteria, pagination, and sorting options for activity log entry snapshots.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1) Authorization and organization scoping
 * - Resolve the currently selected organization context from the authenticated request/session.
 * - Enforce permission rules for activity log viewing: users with org:manage can view the full activity log; others must be blocked or restricted per the authorization policy.
 * - Regardless of permission level, ensure all queries are constrained by `erp_hrm_time_tracking_activity_log_entry_snapshots.erp_hrm_time_tracking_organization_id = <selectedOrganizationId>`.
 *
 * 2) Parse request body (search criteria)
 * - Extract filter criteria from IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest.
 * - Apply filter matching rules using snapshot columns in erp_hrm_time_tracking_activity_log_entry_snapshots:
 *   - action type filters against `snapshot_action_type`.
 *   - performer/user filters using `performer_type` + `performer_id`.
 *   - date range filters against snapshot `created_at`.
 *   - target filters against `target_entity_type` + `target_entity_id`.
 *   - text filters (if provided) should use indexed columns (`snapshot_action_summary`, `target_additional_info`) via trigram indexes.
 * - Ensure all filter criteria are combined as logical AND, consistent with requirements that filtered results must include only entries matching all selected criteria.
 *
 * 3) Query
 * - Execute a single paginated query against erp_hrm_time_tracking_activity_log_entry_snapshots with the organization constraint and all applied filters.
 * - Use ORDER BY according to sorting options from the request body (fall back to created_at descending if the DTO schema allows it).
 *
 * 4) Pagination
 * - Compute total count and page results (or use cursor-based pagination if defined in the DTO).
 * - If no rows match, return an empty `data` array with pagination metadata.
 *
 * 5) Response shaping
 * - Map each snapshot row to IErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary fields.
 * - Do not include unrelated domain entity details; keep summary-only to match list browsing expectations.
 *
 * 6) Error handling
 * - Validate filter inputs according to DTO rules; reject invalid payloads with appropriate 4xx errors.
 * - Never return snapshots from other organizations; treat cross-scope access attempts as empty or blocked per authorization policy.
 *
 * Database relations:
 * - Snapshot-to-entry relation exists via `erp_hrm_time_tracking_activity_log_entry_id`, but this endpoint should prefer snapshot columns for filtering. Join to base entries only if the request DTO explicitly requests fields not available in snapshot columns.
 * @path /erpHrmTimeTracking/member/activityLogSnapshots/search
 * @accessor api.functional.erpHrmTimeTracking.member.activityLogSnapshots.search
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function search(
  connection: IConnection,
  props: search.Props,
): Promise<search.Response> {
  return true === connection.simulate
    ? search.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...search.METADATA,
          path: search.path(),
          status: null,
        },
        props.body,
      );
}
export namespace search {
  export type Props = {
    /**
     * Search criteria, pagination, and sorting options for activity log entry snapshots.
     */
    body: IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  };
  export type Body = IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  export type Response =
    IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/erpHrmTimeTracking/member/activityLogSnapshots/search",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () =>
    "/erpHrmTimeTracking/member/activityLogSnapshots/search";
  export const random =
    (): IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary =>
      typia.random<IPageIErpHrmTimeTrackingActivityLogEntrySnapshot.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: search.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: search.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
