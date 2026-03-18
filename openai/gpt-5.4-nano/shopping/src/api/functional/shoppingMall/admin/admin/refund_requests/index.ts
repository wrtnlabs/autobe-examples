import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallRefundRequest } from "../../../../../structures/IPageIShoppingMallRefundRequest";
import { IShoppingMallRefundRequest } from "../../../../../structures/IShoppingMallRefundRequest";

/**
 * Retrieve a filtered and paginated list of customer refund requests for order items for administrative oversight.
 *
 * This operation is designed for administrators to monitor refund workflows that are represented in the database by `shopping_mall_refund_requests`. Each refund request record belongs to a specific `shopping_mall_order_items` row via `shopping_mall_refund_requests.shopping_mall_order_item_id`, and the request has workflow fields such as `customer_reason`, `status`, `seller_comment`, and `decisioned_at`.
 *
 * The operation returns a paginated set of refund-request summaries suitable for an admin list UI (for example, showing pending requests awaiting seller decision/approval, or showing historical approved/rejected requests). The underlying ordering and filtering logic should be consistent with list browsing expectations and the error/edge behavior for administrative oversight.
 *
 * Authorization: this endpoint is intended for authenticated administrators (the `admin` actor). Non-admin actors must be denied.
 *
 * Related domain behavior: administrative force-cancellation and force-refund outcomes affect `shopping_mall_order_items.line_item_status` and require consistent inventory restoration and snapshot trail integrity. Those state-changing actions must be implemented via dedicated administrative oversight endpoints; this endpoint must not mutate any state. It should only read from `shopping_mall_refund_requests` (and any required read-only joins for display).
 *
 * Expected behavior and error handling: if the provided filters reference non-existent or invalid states, the operation should return an empty list rather than an error. If pagination parameters are invalid, clamp to safe bounds or return validation errors according to the project’s standard error handling.
 *
 * Retry safety: because this endpoint is read-only, retries must not create or duplicate any domain records and must return deterministic results given the same filter inputs and dataset state.
 *
 * @param props.connection
 * @param props.body Search criteria and pagination options for admin refund request oversight.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps for Realize Agent:
 *
 * 1) Authorization and actor scope
 * - Require administrator authentication.
 *
 * 2) Parse requestBody criteria (IShoppingMallRefundRequest.IRequest)
 * - Extract pagination parameters (page size / cursor / offset based on the project’s standard inside the DTO).
 * - Extract optional filters such as:
 *   - refund request `status` (maps to shopping_mall_refund_requests.status)
 *   - date range filters over `created_at` (and optionally `decisioned_at` if supported by DTO)
 *   - free-text search over `customer_reason` and/or `seller_comment` if supported by DTO
 *   - optional scoping by `shopping_mall_order_item_id` if supported by DTO
 *
 * 3) Build database query
 * - Query `shopping_mall_refund_requests` as the primary table.
 * - Apply filters only on existing columns:
 *   - shopping_mall_refund_requests.status
 *   - shopping_mall_refund_requests.customer_reason
 *   - shopping_mall_refund_requests.seller_comment
 *   - shopping_mall_refund_requests.decisioned_at
 *   - shopping_mall_refund_requests.created_at
 *   - shopping_mall_refund_requests.shopping_mall_order_item_id
 * - Apply deterministic ordering (e.g., by created_at desc, then id) to ensure stable pagination.
 * - Join read-only related entities ONLY if necessary to populate the summary DTO fields (for example, order item status via shopping_mall_order_items.line_item_status, variant/product info via shopping_mall_order_items.shopping_mall_product_variant_id and/or snapshots if the DTO requires it).
 *
 * 4) Pagination
 * - Return results as a paginated container DTO following the platform convention (`IPage...ISummary`).
 * - Include pagination metadata (total if required by DTO; otherwise include page cursor/hasNext).
 *
 * 5) Data integrity and immutability
 * - Do not mutate any tables.
 * - Do not attempt snapshot creation or inventory restoration; those concerns belong to force-cancel/force-refund write operations.
 *
 * 6) Edge cases
 * - If no rows match filters, return an empty `data` array with valid pagination metadata.
 * - If optional joins are used and a related row is missing due to deletion, still return the refund request if the refund request row is present; otherwise exclude based on join type consistent with DTO expectations.
 *
 * 7) Response mapping
 * - Map each row to the corresponding summary DTO type (IShoppingMallRefundRequest.ISummary or equivalent), ensuring type names and field mapping strictly follow the generated schema DTO definitions.
 *
 * 8) Observability
 * - Log query criteria and admin request id in server logs at an appropriate level without leaking sensitive personal data beyond what the summary DTO allows.
 * @path /shoppingMall/admin/admin/refund-requests
 * @accessor api.functional.shoppingMall.admin.admin.refund_requests.index
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
     * Search criteria and pagination options for admin refund request oversight.
     */
    body: IShoppingMallRefundRequest.IRequest;
  };
  export type Body = IShoppingMallRefundRequest.IRequest;
  export type Response = IPageIShoppingMallRefundRequest.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/admin/refund-requests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/admin/admin/refund-requests";
  export const random = (): IPageIShoppingMallRefundRequest.ISummary =>
    typia.random<IPageIShoppingMallRefundRequest.ISummary>();
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
 * Retrieve a specific refund request for administrative oversight.
 *
 * This endpoint targets a single refund request identified by `refundRequestId` and returns the refund request workflow data stored in `shopping_mall_refund_requests`, including the customer-provided reason (`customer_reason`), the current refund request workflow status (`status`), seller decision metadata (`seller_comment`, `decisioned_at`), and record timestamps (`created_at`, `updated_at`).
 *
 * The returned refund request is always interpreted in the context of its associated order item. Internally, the operation joins `shopping_mall_refund_requests.shopping_mall_order_item_id` to `shopping_mall_order_items.id` so the administrator can understand which purchased line item the refund request belongs to, and (indirectly) which order it is part of via `shopping_mall_order_items.shopping_mall_order_id` -> `shopping_mall_orders.id`. This contextual linkage is required to prevent administrators from making decisions based on mismatched order-item relationships.
 *
 * Authorization: only authenticated administrators are allowed to access this endpoint, since refund requests require platform-wide governance visibility.
 *
 * Behavior and error handling:
 * - If the refund request does not exist (or is hidden from active views due to record deletion), the operation should respond with an appropriate not-found error.
 * - The operation must not alter any data, must not create new snapshots, and must not perform any refund/cancellation business outcomes. It is a pure read used to inspect the current state.
 *
 * Related operations:
 * - Administrators can force-refund order items or entire orders via their dedicated write operations; those operations update the order item outcome and ensure inventory restoration and snapshot trail integrity.
 * - Administrators may also review the related order and shipment states via their own read endpoints to confirm that the refund outcome is reflected consistently in fulfillment-linked views.
 *
 * This endpoint complements the force/refund workflows by providing the precise refund request record to audit decisions and timelines.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request ID (UUID) to retrieve.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps:
 * 1. Parse `refundRequestId` from path (UUID string).
 * 2. Query `shopping_mall_refund_requests` by `id = refundRequestId` and ensure the record is not excluded by any runtime rule for active views (e.g., deleted_at null filtering if your service applies such filters).
 * 3. Load linked order item context by joining `shopping_mall_order_items` on `shopping_mall_order_items.id = shopping_mall_refund_requests.shopping_mall_order_item_id`.
 * 4. Optionally (if required by the response DTO), load linked order header by joining `shopping_mall_orders` on `shopping_mall_orders.id = shopping_mall_order_items.shopping_mall_order_id` to provide order-level identifiers/details used by the DTO.
 * 5. Map database fields to the response DTO: refund request id, customer_reason, status, seller_comment, decisioned_at, created_at, updated_at.
 * 6. Return 404 if refund request record is not found.
 * 7. Do not perform any status transitions, stock restoration, inventory updates, shipment reconciliation, or snapshot creation; this endpoint must be read-only.
 *
 * Edge cases:
 * - If the linked order item exists but the refund request references a missing order item (referential inconsistency), treat as not found or internal error depending on your consistency policy.
 *
 * Transactions:
 * - No transaction required for read-only operation (use a single read connection / snapshot isolation consistent with your DB defaults).
 * @path /shoppingMall/admin/admin/refund-requests/:refundRequestId
 * @accessor api.functional.shoppingMall.admin.admin.refund_requests.at
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
     * Target refund request ID (UUID) to retrieve.
     */
    refundRequestId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallRefundRequest;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/admin/admin/refund-requests/:refundRequestId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/admin/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}`;
  export const random = (): IShoppingMallRefundRequest =>
    typia.random<IShoppingMallRefundRequest>();
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
      assert.param("refundRequestId")(() =>
        typia.assert(props.refundRequestId),
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

/**
 * Updates a single refund request that belongs to an order item, using an administrator decision workflow.
 *
 * This endpoint is intended for the platform’s administrative oversight of customer refund requests. The target record is the refund request identified by `refundRequestId`, which corresponds to `shopping_mall_refund_requests.id` (including its workflow `status`, the customer-provided `customer_reason`, and optional seller decision metadata such as `seller_comment` and `decisioned_at`).
 *
 * The operation may also drive the related order-item outcome: the refund request belongs to exactly one `shopping_mall_order_items` row (`shopping_mall_refund_requests.shopping_mall_order_item_id`). When the administrator decision results in a refund outcome, the system must update the corresponding order item `line_item_status` consistently with the platform refund behavior, without unintentionally changing other order items.
 *
 * Because refund/cancellation oversight outcomes are dispute-resolution sensitive, any required snapshot trail must remain intact and must not be retroactively modified. If snapshot creation is required for the final decision transition, it must be recorded using the platform snapshot mechanism (`shopping_mall_snapshots` and its 1:1 payload records in `shopping_mall_snapshot_payloads`) in a retry-safe way (avoid creating multiple conflicting snapshot records for the same final outcome).
 *
 * Security/authorization: only an `admin` actor can call this operation. The system must verify that the administrator can view and manage the underlying refund request and its related order item outcome.
 *
 * Validation and error handling:
 * - If the refund request does not exist (or is not accessible to the administrator’s scope), return an appropriate not-found/forbidden error.
 * - If the refund request is already in a terminal state that would conflict with the requested administrative decision, reject the operation to prevent rule-breaking status transitions.
 * - If applying the decision would cause inconsistent item outcomes (e.g., conflicting transitions after prior fulfillment actions), reject the operation.
 *
 * Related operations: administrators can also force-cancel or force-refund order items or entire orders via dedicated oversight endpoints; those endpoints must remain consistent with this refund request decision behavior regarding order-item status and inventory/snapshot integrity.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request identifier (UUID) to be updated by an administrator.
 * @param props.body Administrator decision payload for updating the refund request workflow outcome. Includes the desired decision status and optional seller comment.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps:
 * 1) Authenticate/authorize: require admin privileges for the caller.
 * 2) Parse `refundRequestId` and load the refund request row from `shopping_mall_refund_requests`.
 *    - If not found (or hidden from admin visibility per `shopping_mall_snapshot_parties` rules if applicable), throw not-found/forbidden.
 * 3) Validate decision input from request body:
 *    - Ensure the refund request `status` can transition to the requested administrative outcome.
 *    - Reject contradictory transitions (e.g., if already approved/refused in a way that violates state ordering rules).
 * 4) Transactional update:
 *    - Begin transaction.
 *    - Update `shopping_mall_refund_requests.status` to the requested outcome.
 *    - Set `seller_comment` if provided.
 *    - Set `decisioned_at` when transitioning out of the pending state (follow DTO semantics).
 * 5) Apply related order-item status change:
 *    - Load the referenced `shopping_mall_order_items` row via `shopping_mall_refund_requests.shopping_mall_order_item_id`.
 *    - If approving/refunding: update `shopping_mall_order_items.line_item_status` to the refunded status value required by business rules, ensuring only that order item changes.
 *    - If rejecting: ensure the order item status is not moved into a refunded terminal state.
 *    - Persist the `shopping_mall_order_items` update within the same transaction.
 * 6) Snapshot trail integrity:
 *    - If the business rules require a final decision snapshot, create a new `shopping_mall_snapshots` row with the appropriate `source_type` and `source_order_item_id` / `source_refund_request_id` linkage, and create/attach a payload record in `shopping_mall_snapshot_payloads`.
 *    - Ensure idempotency: if the operation is retried and a snapshot already exists for the same final outcome state, do not create duplicate conflicting snapshots.
 * 7) Commit transaction.
 * 8) Return the updated refund request detail (and any directly embedded related fields required by the `IShoppingMallRefundRequest` response type).
 *
 * Edge cases:
 * - If the refund request is already decided, reject or return the existing state depending on the DTO’s semantics.
 * - Ensure shipment-linked displays remain consistent with the resulting order-item outcome (if shipments are linked via `shopping_mall_order_items.shopping_mall_shipment_id`).
 * @path /shoppingMall/admin/admin/refund-requests/:refundRequestId
 * @accessor api.functional.shoppingMall.admin.admin.refund_requests.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /**
     * Target refund request identifier (UUID) to be updated by an administrator.
     */
    refundRequestId: string & tags.Format<"uuid">;

    /**
     * Administrator decision payload for updating the refund request workflow outcome. Includes the desired decision status and optional seller comment.
     */
    body: IShoppingMallRefundRequest.IUpdate;
  };
  export type Body = IShoppingMallRefundRequest.IUpdate;
  export type Response = IShoppingMallRefundRequest;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/admin/admin/refund-requests/:refundRequestId",
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
    `/shoppingMall/admin/admin/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}`;
  export const random = (): IShoppingMallRefundRequest =>
    typia.random<IShoppingMallRefundRequest>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("refundRequestId")(() =>
        typia.assert(props.refundRequestId),
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
 * Permanently removes the specified refund request record from the platform data.
 *
 * This operation targets the administrator oversight workflow for customer refund requests. Administrators can review refund requests and must be able to manage the lifecycle of refund-related workflow artifacts. This endpoint permanently removes the referenced refund request identified by refundRequestId.
 *
 * The underlying record is stored in shopping_mall_refund_requests (primary key id). The record belongs to a purchased order item (shopping_mall_refund_requests.shopping_mall_order_item_id references shopping_mall_order_items.id). Because the refund request is part of the refund decision workflow, the service layer must enforce safety checks so that removing this record does not compromise dispute-resolution integrity.
 *
 * When refund oversight actions are applied (for example, force-refund item or force-refund entire order), the system outcome must remain consistent: order item status transitions and inventory restoration must remain traceable, and any required snapshot trail must remain intact, without altering or removing existing snapshot history. Therefore, before erasing the refund request record, the implementation must confirm that the requested deletion is allowed by current refund-request status and does not require preserving an immutable history entry for an already-final outcome.
 *
 * Only administrator actors are authorized to call this operation. Unauthenticated or non-admin actors must be rejected.
 *
 * Expected behavior:
 * - If refundRequestId does not exist, return an error.
 * - If the refund request is not eligible to be erased (for example, a final outcome state where the refund trail must remain for dispute resolution), return an error and do not modify any other records.
 *
 * Related operations:
 * - Administrators can force-refund at the item or order level via their dedicated endpoints, which apply the approved-refund business outcomes (item status becomes refunded, inventory is restored, and order status can be recalculated from items). This delete endpoint is not a replacement for those outcome-setting workflows; it only removes the refund-request record by ID.
 *
 * @param props.connection
 * @param props.refundRequestId Target refund request identifier to permanently remove.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement DELETE for a single refund request by primary key.
 *
 * Algorithm:
 * 1) Authorize caller as admin.
 * 2) Parse refundRequestId from path as UUID.
 * 3) Start a database transaction.
 * 4) Load shopping_mall_refund_requests by id AND (if the system uses deleted_at filtering, only allow non-deleted records) to confirm existence.
 * 5) Apply eligibility checks based on refund_requests.status:
 *    - Allow erasure only when the record is in an erasable state (e.g., not finalized into a refund outcome that must remain for dispute resolution).
 *    - If status is non-erasable, roll back and return a validation/business error.
 * 6) Enforce snapshot trail integrity: if the refund request has any required immutable snapshot outcome chain already created for a final decision, do not erase; return an error.
 * 7) Delete the shopping_mall_refund_requests record.
 * 8) Commit transaction.
 *
 * DB operations:
 * - Primary key lookup on shopping_mall_refund_requests.id.
 * - Conditional delete on shopping_mall_refund_requests.
 *
 * Edge cases:
 * - refundRequestId not found -> return 404-like not-found error.
 * - Concurrent admin actions -> rely on transaction isolation and re-check status eligibility after reload.
 *
 * Do not modify shopping_mall_order_items or shopping_mall_orders in this operation; outcome transitions belong to dedicated force-refund/approval workflows. This endpoint only removes the refund-request record itself when allowed.
 * @path /shoppingMall/admin/admin/refund-requests/:refundRequestId
 * @accessor api.functional.shoppingMall.admin.admin.refund_requests.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target refund request identifier to permanently remove.
     */
    refundRequestId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/admin/admin/refund-requests/:refundRequestId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/admin/refund-requests/${encodeURIComponent(props.refundRequestId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("refundRequestId")(() =>
        typia.assert(props.refundRequestId),
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
