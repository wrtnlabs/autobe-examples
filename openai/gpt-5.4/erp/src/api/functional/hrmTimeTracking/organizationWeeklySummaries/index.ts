import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IHrmTimeTrackingOrganizationWeeklySummary } from "../../../structures/IHrmTimeTrackingOrganizationWeeklySummary";
import { IPageIHrmTimeTrackingOrganizationWeeklySummary } from "../../../structures/IPageIHrmTimeTrackingOrganizationWeeklySummary";

/**
 * Retrieve a filtered and paginated list of organization weekly summary records for the currently selected organization context.
 *
 * This operation serves organization-level analytical viewing rather than transactional data management. It exposes week-by-week summary information derived from time tracking activity in the active workspace, reflecting the business role of organization weekly summaries as derived records used for dashboard insight and weekly reporting. In line with the reporting requirements, each returned summary represents a separate weekly result and is intended to help authorized users compare organizational time patterns over a selected reporting period.
 *
 * Access to this operation must be evaluated within the currently selected organization only. The platform's organization-scoped access rules require report visibility and access evaluation to be based on the caller's role and permissions in the active workspace, not on permissions held in any other organization. This means the same user may be allowed to use this operation in one organization and denied in another, depending on the role catalog and report-viewing permissions that apply in the current context.
 *
 * The returned data is derived from organization-owned business records including employees, projects, timelogs, and related weekly aggregations. Consistent with the weekly summary reporting requirements, the result set should support viewing total hours logged, the number of timelogs recorded, and the number of employees who logged time for each week in the requested range. When a project filter is supplied, the summaries must reflect only logged time associated with that selected project while remaining fully constrained to the active organization.
 *
 * This operation is read-only and does not create independent dashboard or report records merely by being called. It should be used when clients need analytical weekly summaries for management review, organization reporting views, or other permission-controlled summary screens. If a client needs broader report configuration persistence, that should be handled through report-definition resources; if it needs current dashboard metrics, that should be handled through dashboard-oriented operations. This endpoint specifically returns weekly organization summary data optimized for filtered retrieval and comparison across weeks.
 *
 * Error handling must preserve organization isolation and avoid misleading outcomes. If authorization is missing in the current organization, the request must be denied. If supplied filters reference a project outside the current organization, the operation must reject the request rather than mixing cross-organization data. Because this is a retrieval over derived data, failures should never imply that summary data was changed or generated anew by the caller.
 *
 * @param props.connection
 * @param props.body Weekly summary filters and pagination criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Accept a JSON request body of type
 *   IOrganizationWeeklySummary.IRequest containing at minimum pagination and
 *   optional analytical filters such as reporting date range, optional project
 *   identifier, and sort criteria.
 *
 * Resolve the caller's currently selected organization context before any data access. Evaluate whether the caller has report viewing permission in that organization. Reject the request when the permission is absent, even if the same caller has report visibility in another organization.
 *
 * Build a query over hrm_time_tracking_organization_weekly_summaries constrained to the active organization. If the summary table does not itself contain every presentation field needed by the DTO, enrich the result through organization-scoped joins or subqueries against related project, timelog, or employee aggregates, but never read data outside the selected organization.
 *
 * Apply the requested reporting period filters so only summary rows whose week falls inside the requested date range are included. If a project filter is present, validate that the project belongs to the active organization before applying it. Reject invalid cross-organization references.
 *
 * Return the result as a paginated collection ordered by week according to the requested sort direction, defaulting to most recent week first when no explicit sort is provided. Each item should expose the weekly measures required by the business requirements: total logged hours, timelog count, and employee count for that week. If no matching data exists, return an empty page rather than an error.
 *
 * The operation is read-only. Do not create, refresh, or persist summary records as a side effect of retrieval unless the implementation architecture explicitly maintains these derived records internally before query execution. Even in that case, the caller-facing behavior must remain a pure read and must not report partial success if an internal dependency fails.
 *
 * If an external dependency is involved in preparing derived insight data, treat timeout or integration failure as a failed read rather than returning uncertain analytics. Preserve existing records, preserve organization isolation, and never expose data from another organization while handling the error.
 * @path /hrmTimeTracking/organizationWeeklySummaries
 * @accessor api.functional.hrmTimeTracking.organizationWeeklySummaries.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Weekly summary filters and pagination criteria
     */
    body: IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  };
  export type Body = IHrmTimeTrackingOrganizationWeeklySummary.IRequest;
  export type Response =
    IPageIHrmTimeTrackingOrganizationWeeklySummary.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/hrmTimeTracking/organizationWeeklySummaries",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/hrmTimeTracking/organizationWeeklySummaries";
  export const random =
    (): IPageIHrmTimeTrackingOrganizationWeeklySummary.ISummary =>
      typia.random<IPageIHrmTimeTrackingOrganizationWeeklySummary.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
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

/**
 * Retrieve one derived weekly summary record for the current organization's reporting context.
 *
 * This operation returns the detailed representation of a single organization weekly summary identified by `organizationWeeklySummaryId`. The underlying resource corresponds to `hrm_time_tracking_organization_weekly_summaries`, a derived subsidiary insights record described as a weekly organization summary used for dashboard and reporting use. In business terms, this endpoint exposes one week-level analytical result from the Weekly Summary Report, where the reporting requirements specify that each week must show total hours logged, the number of timelogs recorded, and the number of employees who logged time.
 *
 * Access to this operation must be evaluated within the currently selected organization context. The requirements state that role-based access is organization-scoped and that permissions from another organization must not grant access in the current one. Therefore, the implementation must confirm that the caller has report-viewing authority for the selected organization before returning the summary. Owners generally have full access within their organization, and managers may access this data when their organization-scoped permissions allow report viewing. The operation must not expose summary data from any other organization.
 *
 * The resource is reporting output, not a manually maintained transaction record. The Weekly Summary Report rules define a constrained aggregation surface: when a valid date range is used to generate weekly summaries, the system shows only weekly total hours, weekly timelog count, and weekly employee count, and must not include other measures in that report. Although this endpoint retrieves a previously derived summary row rather than generating a date-range report on demand, the returned entity should remain consistent with those business rules and the meaning of a weekly summary period.
 *
 * This operation is commonly used after a list or report-generation workflow has identified a target weekly summary entry. For example, a client may first execute the report-oriented API that browses weekly summaries across a date range, then call this endpoint to fetch one specific persisted summary record for inspection, dashboard drill-down, or reconciliation of organization-level weekly metrics. If the summary identifier does not exist, does not belong to the current organization, or the caller lacks permission in the current organization context, the request must fail without revealing cross-organization data.
 *
 * @param props.connection
 * @param props.organizationWeeklySummaryId Target organization weekly summary record identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only service method that loads one
 *   record from `hrm_time_tracking_organization_weekly_summaries` by its
 *   primary identifier and validates organization-scoped access before
 *   returning it.
 *
 * Resolve the caller's current organization context from authentication/session state, then verify that the caller is allowed to view reporting data in that organization. Enforce the organization-scoped permission model described in the requirements: permissions must be evaluated only in the current organization, and permissions from another organization must not authorize access. If the caller lacks reporting access, reject the request.
 *
 * Query the organization weekly summary table by `organizationWeeklySummaryId`. The query must also constrain the row to the caller's current organization so that possession of an identifier alone is never sufficient to read a record from another tenant. If the schema stores only an organization foreign key on the summary record, filter directly on that foreign key. If the summary is reached through another reporting parent, join as needed to confirm organization ownership before returning the row.
 *
 * Return the mapped `IHrmTimeTrackingOrganizationWeeklySummary` DTO for the located record. Preserve the semantics of the weekly summary report rules: this entity represents one week-level aggregate used for dashboard and reporting purposes and should reflect only the supported measures for that summary concept, namely weekly total hours, weekly timelog count, and weekly employee count, along with its identifying and period fields defined in the schema.
 *
 * Handle errors explicitly. Return not found when no matching summary exists in the current organization context. Return forbidden when the caller is authenticated but lacks report-viewing authority in the current organization. Do not reveal whether a record exists in another organization. This operation performs no mutation, no regeneration of aggregates, and no external integration calls.
 * @path /hrmTimeTracking/organizationWeeklySummaries/:organizationWeeklySummaryId
 * @accessor api.functional.hrmTimeTracking.organizationWeeklySummaries.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target organization weekly summary record identifier
     */
    organizationWeeklySummaryId: string & tags.Format<"uuid">;
  };
  export type Response = IHrmTimeTrackingOrganizationWeeklySummary;

  export const METADATA = {
    method: "GET",
    path: "/hrmTimeTracking/organizationWeeklySummaries/:organizationWeeklySummaryId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/hrmTimeTracking/organizationWeeklySummaries/${encodeURIComponent(props.organizationWeeklySummaryId ?? "null")}`;
  export const random = (): IHrmTimeTrackingOrganizationWeeklySummary =>
    typia.random<IHrmTimeTrackingOrganizationWeeklySummary>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("organizationWeeklySummaryId")(() =>
        typia.assert(props.organizationWeeklySummaryId),
      );
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
