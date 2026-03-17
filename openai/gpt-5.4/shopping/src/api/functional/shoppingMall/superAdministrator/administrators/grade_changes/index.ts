import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallAdministratorGradeChange } from "../../../../../structures/IPageIShoppingMallAdministratorGradeChange";
import { IShoppingMallAdministratorGradeChange } from "../../../../../structures/IShoppingMallAdministratorGradeChange";

/**
 * Promote an existing administrator account to super administrator by creating a new administrator grade-change record for the target administrator.
 *
 * This operation supports the platform's highest-level governance workflow for administrative grade control. According to the requirements, a super administrator may elevate a regular administrator to super administrator when broader governance authority is needed. The endpoint is bound to an existing administrator account identified by `administratorId`, and the promotion outcome is represented as an immutable record in `shopping_mall_administrator_grade_changes`, which is documented in the database schema as an append-only audit table for administrator promotion and demotion decisions.
 *
 * The underlying administrator identity comes from `shopping_mall_administrators`, the canonical table for elevated platform governance access. That table stores the administrator's authentication identity and lifecycle controls such as `active`, `banned`, and `deleted_at`. The audit event is then stored with the target administrator reference, the acting super administrator reference, the `previous_grade`, the `new_grade`, an optional `reason`, and the execution timestamp `created_at`. Because the grade-change table is explicitly historical and append-only, this operation creates a new governance event rather than updating or deleting an earlier one.
 *
 * This endpoint is intended only for authenticated super administrators. Regular administrators must not be allowed to use it, and unauthorized attempts must leave all grades unchanged. The requirements also distinguish administrator grades in all grade-change decisions, so the implementation must confirm that the acting user currently has super administrator authority and that the target administrator is currently a regular administrator before applying the promotion. If the target is already at super administrator grade, the request must be rejected instead of producing a duplicate elevation event.
 *
 * The request body is limited to the promotion input needed for governance documentation, such as an optional explanatory reason. The acting super administrator identity must come from the authenticated session rather than client input. This protects the integrity of the audit trail and ensures that the `shopping_mall_super_administrator_id` stored in the grade-change record corresponds to the real authenticated authority who performed the action.
 *
 * This operation is commonly related to administrator roster and governance oversight features. For example, a client may first retrieve administrator account listings to determine which administrator currently holds regular or super administrator standing, then invoke this endpoint to elevate a selected regular administrator. After successful completion, subsequent administrator management operations reserved for super administrators become available to the promoted account according to the business requirements.
 *
 * Expected failures include a missing target administrator, a deleted administrator account, an unauthorized acting user, or an invalid target grade state. In all rejection scenarios, the system must preserve the current governance state and avoid creating any grade-change history row. On success, the operation returns the created grade-change record so clients can display the completed governance action and its recorded reason.
 *
 * @param props.connection
 * @param props.administratorId Target administrator account ID
 * @param props.body Promotion reason for the administrator grade change
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdministrator
 * @x-autobe-specification Implement this operation as an authenticated super-administrator-only governance command.
 *
 * 1. Resolve the acting identity from the authenticated session and verify that the actor has super administrator authority. Do not accept the acting authority identifier from the request body.
 * 2. Load the target row from `shopping_mall_administrators` by `administratorId`.
 * 3. Reject when the target administrator does not exist.
 * 4. Reject when the target administrator has `deleted_at` populated, is banned in a way that platform policy forbids governance changes, or otherwise cannot participate in current administrator governance according to service rules.
 * 5. Determine the target administrator's current grade using the system's authoritative grade state resolution logic. Because `shopping_mall_administrators` does not contain a grade column in the loaded schema, the service must resolve current standing from the governance model used by the application and confirm whether the target is currently a regular administrator.
 * 6. Reject when the acting user is not authorized, when the target is already a super administrator, or when the requested transition is not `regular administrator -> super administrator`.
 * 7. Start a transaction.
 * 8. Insert a new row into `shopping_mall_administrator_grade_changes` with a generated UUID `id`, the target `shopping_mall_administrator_id`, the authenticated acting `shopping_mall_super_administrator_id`, `previous_grade` set to the resolved current grade, `new_grade` set to `super administrator`, optional `reason` from the request body, and `created_at` set to the current timestamp.
 * 9. Apply or publish the resulting effective grade-state change through the application's governance-grade mechanism so subsequent authorization checks recognize the target as a super administrator only after the transaction succeeds.
 * 10. Commit the transaction and return the created grade-change record.
 *
 * Implementation notes:
 * - Treat the grade-change record as immutable after insertion; do not update or delete it.
 * - Ensure unsuccessful authorization or validation checks do not write any audit record.
 * - Preserve unchanged governance state on all failures, matching the loaded requirements.
 * - Return a not-found error for an unknown `administratorId`, a forbidden error for insufficient authority, and a conflict or bad-request style error when the target is not eligible for promotion because of current grade state.
 * - If the service exposes administrator listings elsewhere, this operation does not depend on a pre-executed API, but those listings are a common discovery step for selecting the target administrator.
 * @path /shoppingMall/superAdministrator/administrators/:administratorId/grade-changes
 * @accessor api.functional.shoppingMall.superAdministrator.administrators.grade_changes.promote
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function promote(
  connection: IConnection,
  props: promote.Props,
): Promise<promote.Response> {
  return true === connection.simulate
    ? promote.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...promote.METADATA,
          path: promote.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace promote {
  export type Props = {
    /**
     * Target administrator account ID
     */
    administratorId: string & tags.Format<"uuid">;

    /**
     * Promotion reason for the administrator grade change
     */
    body: IShoppingMallAdministratorGradeChange.ICreate;
  };
  export type Body = IShoppingMallAdministratorGradeChange.ICreate;
  export type Response = IShoppingMallAdministratorGradeChange;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/superAdministrator/administrators/:administratorId/grade-changes",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/superAdministrator/administrators/${encodeURIComponent(props.administratorId ?? "null")}/grade-changes`;
  export const random = (): IShoppingMallAdministratorGradeChange =>
    typia.random<IShoppingMallAdministratorGradeChange>();
  export const simulate = (
    connection: IConnection,
    props: promote.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: promote.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("administratorId")(() =>
        typia.assert(props.administratorId),
      );
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
 * Retrieve a filtered and paginated history of administrative grade changes for a specific administrator account.
 *
 * This operation exposes the governance audit trail recorded for one administrator in the shopping_mall_administrator_grade_changes table. Each returned record represents one completed promotion or demotion event affecting the target shopping_mall_administrators account, including the previous grade, the new grade, the acting super administrator who executed the change, any optional explanatory reason, and the time when the decision was recorded. The underlying schema defines these rows as immutable audit records preserved for traceability, oversight, and dispute review, so this endpoint is designed as a read-only historical browsing operation.
 *
 * Access to this operation is intended for platform governance actors only. The loaded requirements describe the administrator account listing and oversight view as an internal operational roster for understanding who holds management authority, and the broader administrator oversight journey establishes that administrator grade management belongs to super-administrator-led governance. Accordingly, this endpoint supports administrator and superAdministrator review of authority history, not customer-facing shopping behavior or seller-facing marketplace operations.
 *
 * The target administrator is identified by the path parameter administratorId, which maps to shopping_mall_administrators.id. The history being listed is scoped to that single administrator account through shopping_mall_administrator_grade_changes.shopping_mall_administrator_id. Consumers may use the request body to paginate through the audit trail, sort by event time, and apply filters such as previous grade, new grade, acting super administrator, or date range, depending on the request DTO definition. This is especially useful when reviewing a long governance history for a heavily managed administrative account.
 *
 * This endpoint documents completed grade-change outcomes only. It does not perform promotion or demotion itself, does not expose self-demotion as an action, and does not alter any administrator grade. The loaded requirements explicitly state that successful promotion and demotion change the target administrator's current authority, while unauthorized attempts must leave grades unchanged. Those business rules are relevant context for interpreting the audit history returned here: only completed changes should appear in this list, while rejected attempts belong to operational error handling rather than persisted grade-change events.
 *
 * This operation is commonly used together with the administrator roster view and the grade-change mutation operations that create new audit rows after successful governance actions. A caller would typically identify an administrator from the roster first, then call this endpoint to inspect the historical sequence of authority changes for that account during compliance review, administrative dispute analysis, or internal oversight.
 *
 * @param props.connection
 * @param props.administratorId Target administrator account ID whose grade-change history is being reviewed
 * @param props.body Filtering, sorting, and pagination criteria for administrator grade-change history
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdministrator
 * @x-autobe-specification Validate that the authenticated actor is an administrator or superAdministrator with governance-view permission. Resolve the target administrator by shopping_mall_administrators.id using the administratorId path parameter and reject the request if no matching administrator exists or if the administrator record is not viewable under current governance rules.
 *
 * Query shopping_mall_administrator_grade_changes as an immutable audit source filtered by shopping_mall_administrator_id = :administratorId. Build the list query from IShoppingMallAdministratorGradeChange.IRequest, supporting pagination, stable sorting, and optional filters over previous_grade, new_grade, shopping_mall_super_administrator_id, created_at range, and free-text reason where such fields are defined in the request DTO. Default sort should prioritize created_at descending so the newest governance events appear first.
 *
 * Join or separately resolve the related acting super administrator only as needed for the summary projection referenced by IShoppingMallAdministratorGradeChange.ISummary. Do not mutate any grade-change record because the table is append-only by design and historical rows must never be updated or deleted after creation.
 *
 * Return a paginated response of type IPageIShoppingMallAdministratorGradeChange.ISummary containing the filtered audit records for the one target administrator. Ensure pagination metadata reflects the same filtered dataset. If authorization fails, reject without exposing audit history. If the target administrator does not exist, reject before querying the history table. Preserve transactional read consistency appropriate for audit review, but no write transaction is required because this is a read-only operation.
 * @path /shoppingMall/superAdministrator/administrators/:administratorId/grade-changes
 * @accessor api.functional.shoppingMall.superAdministrator.administrators.grade_changes.index
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
          path: index.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Target administrator account ID whose grade-change history is being reviewed
     */
    administratorId: string & tags.Format<"uuid">;

    /**
     * Filtering, sorting, and pagination criteria for administrator grade-change history
     */
    body: IShoppingMallAdministratorGradeChange.IRequest;
  };
  export type Body = IShoppingMallAdministratorGradeChange.IRequest;
  export type Response = IPageIShoppingMallAdministratorGradeChange.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/superAdministrator/administrators/:administratorId/grade-changes",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/shoppingMall/superAdministrator/administrators/${encodeURIComponent(props.administratorId ?? "null")}/grade-changes`;
  export const random =
    (): IPageIShoppingMallAdministratorGradeChange.ISummary =>
      typia.random<IPageIShoppingMallAdministratorGradeChange.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("administratorId")(() =>
        typia.assert(props.administratorId),
      );
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
 * Retrieve one administrator grade change record for a specific administrator account.
 *
 * This operation provides governance-level visibility into a single immutable administrator grade transition event recorded in the administrator grade change history. It is used when an authorized administrative actor needs to inspect the exact promotion or demotion event attached to an administrator account, including the previous grade, the new grade, the acting super administrator identity, any optional explanatory note, and the time the change was executed. This supports the platform requirement that administrator grade assignment be controlled, reviewable, and traceable as part of top-level governance.
 *
 * The operation is grounded in the shopping_mall_administrator_grade_changes table, which is described as an append-only audit record store for completed promotion and demotion decisions affecting existing shopping_mall_administrators accounts. The parent shopping_mall_administrators table represents administrator identities with elevated governance access, while each grade change row captures the administrator whose grade was changed, the super administrator who executed the change, the previous and new grades, the optional reason, and the recorded execution timestamp. Because the grade change record is historically preserved and should never be updated or deleted after creation, this endpoint returns a read-only governance artifact rather than an editable resource.
 *
 * Access to this operation should be restricted to platform governance actors. The requirements define administrator account listing and oversight as an administrative business view, not a customer-facing or seller-facing workflow. Regular administrators may need visibility into the administrative roster and governance context, while super administrators hold the elevated authority to actually perform grade assignment changes. This endpoint therefore exists to support oversight, audit review, and authority verification, not shopping, selling, authentication, or account self-service.
 *
 * The nested route structure is significant. The administratorId path parameter identifies the administrator account whose grade history is being inspected, and the gradeChangeId path parameter identifies the exact immutable audit event under that administrator. Implementations must verify that the requested grade change row belongs to the specified administrator before returning data. If either the administrator does not exist, the grade change does not exist, or the grade change belongs to a different administrator, the request must fail rather than exposing unrelated governance history.
 *
 * This operation may be used together with an administrator roster or administrator grade history listing endpoint. A caller would typically first browse administrators in an oversight list, then review a selected administrator’s grade history, and finally call this detail endpoint to inspect one promotion or demotion event in full. That workflow is especially relevant for reviewing authority transitions such as promotion of a regular administrator to super administrator, demotion of a super administrator to regular administrator, and confirmation that self-demotion is not a valid governance outcome.
 *
 * @param props.connection
 * @param props.administratorId Target administrator account identifier whose grade change history is being inspected.
 * @param props.gradeChangeId Identifier of the administrator grade change record under the target administrator.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor superAdministrator
 * @x-autobe-specification Implement a read-only detail query against shopping_mall_administrator_grade_changes joined to shopping_mall_administrators and, if needed for DTO composition, the acting super administrator identity referenced by shopping_mall_super_administrator_id.
 *
 * Step 1: Authorize the caller as an administrative actor. Reject customer and seller actors. If the platform's authorization policy distinguishes between administrator and super administrator for read access, enforce that policy before database access.
 *
 * Step 2: Validate the two path parameters as UUIDs. administratorId identifies shopping_mall_administrators.id. gradeChangeId identifies shopping_mall_administrator_grade_changes.id.
 *
 * Step 3: Confirm that the parent administrator exists and is not mismatched. Query shopping_mall_administrators by id = administratorId. If no row exists, return a not-found error.
 *
 * Step 4: Query shopping_mall_administrator_grade_changes by id = gradeChangeId and shopping_mall_administrator_id = administratorId in the same predicate. This dual-key lookup is required so the endpoint cannot expose a grade change belonging to another administrator. Because the table is append-only, no update lock or transaction is required for the read itself.
 *
 * Step 5: Map the result into IShoppingMallAdministratorGradeChange. Include the immutable audit fields captured by the schema: id, shoppingMallAdministratorId or equivalent administrator reference, acting super administrator reference derived from shopping_mall_super_administrator_id, previous grade, new grade, optional reason, and createdAt. Preserve nullability for the optional reason field.
 *
 * Step 6: Return the mapped DTO. Do not mutate audit data, administrator grade state, or related session state during this operation.
 *
 * Error handling: return not found when the administrator does not exist or when the grade change id is absent under that administrator. Return forbidden when a non-administrative actor attempts access. Return validation errors for malformed UUID path parameters. Do not infer ownership from gradeChangeId alone; always enforce the nested parent-child match.
 *
 * Performance considerations: use the primary key lookup on shopping_mall_administrator_grade_changes.id plus the existing index on [shopping_mall_administrator_id, created_at] as appropriate for surrounding history operations. For this detail endpoint, a direct id lookup with parent verification is sufficient. The implementation should remain side-effect free and deterministic because the source table represents immutable governance history.
 * @path /shoppingMall/superAdministrator/administrators/:administratorId/grade-changes/:gradeChangeId
 * @accessor api.functional.shoppingMall.superAdministrator.administrators.grade_changes.at
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
     * Target administrator account identifier whose grade change history is being inspected.
     */
    administratorId: string & tags.Format<"uuid">;

    /**
     * Identifier of the administrator grade change record under the target administrator.
     */
    gradeChangeId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallAdministratorGradeChange;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/superAdministrator/administrators/:administratorId/grade-changes/:gradeChangeId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/superAdministrator/administrators/${encodeURIComponent(props.administratorId ?? "null")}/grade-changes/${encodeURIComponent(props.gradeChangeId ?? "null")}`;
  export const random = (): IShoppingMallAdministratorGradeChange =>
    typia.random<IShoppingMallAdministratorGradeChange>();
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
      assert.param("administratorId")(() =>
        typia.assert(props.administratorId),
      );
      assert.param("gradeChangeId")(() => typia.assert(props.gradeChangeId));
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
