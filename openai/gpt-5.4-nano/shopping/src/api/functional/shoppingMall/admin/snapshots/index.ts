import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallSnapshot } from "../../../../structures/IPageIShoppingMallSnapshot";
import { IShoppingMallSnapshot } from "../../../../structures/IShoppingMallSnapshot";

export * as parties from "./parties/index";
export * as payloads from "./payloads/index";
export * as lookup_by_code from "./lookup_by_code/index";

/**
 * Create an immutable snapshot record for dispute resolution and historical auditing.
 *
 * This operation creates a new row in `shopping_mall_snapshots` to store snapshot metadata, including `snapshot_code`, `source_type`, the `source_entity_id` that the snapshot captures, and optional linkage fields such as `source_seller_id`, `source_order_id`, `source_order_item_id`, `source_review_id`, `source_cancellation_request_id`, and `source_refund_request_id`. The snapshot’s business reason is persisted via the `reason` field, and its timing is recorded using `created_at` and `updated_at`.
 *
 * Snapshot content is stored in `shopping_mall_snapshot_payloads` in a dedicated 1:1 table keyed by `shopping_mall_snapshot_id`. This separation ensures that snapshot metadata and snapshot payload can be managed consistently and that payload creation corresponds exactly to the snapshot record being inserted.
 *
 * Visibility rules for dispute resolution are expressed via `shopping_mall_snapshot_parties`, which links a snapshot to viewing parties (identified by `party_type` and `party_id`) and a `can_view` flag. The snapshot remains available for viewing by permitted parties even when the underlying editable entity has been deleted.
 *
 * The platform treats snapshots as immutable historical truth. The system must create snapshots only after the corresponding business edit succeeds; if an attempted edit fails validation and is not applied, the system must avoid creating misleading snapshot content that implies a change occurred. Additionally, any attempt to modify or remove snapshot records must be rejected by the system (even if those attempts are made through other operations).
 *
 * Implementation of this operation should be used as a low-level primitive by business workflows that perform edits (e.g., product edits, order-item workflow transitions, review edits). Those workflows should call this endpoint only after they have committed their changes successfully so the snapshot can represent the correct before-and-after state.
 *
 * @param props.connection
 * @param props.body Creation request for an immutable snapshot capturing a point-in-time state of a domain entity. The request contains snapshot metadata for shopping_mall_snapshots and the serialized snapshot payload for shopping_mall_snapshot_payloads, along with optional visibility party links for shopping_mall_snapshot_parties.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps for POST /snapshots:
 *
 * 1) Validate request body:
 * - Ensure `snapshot_code` is provided and will be unique (enforce/handle `shopping_mall_snapshots @@unique([snapshot_code])`).
 * - Ensure `source_type` and `source_entity_id` are provided; `source_entity_id` identifies the primary source instance being snapshotted.
 * - Ensure required linkage fields for the given `source_type` are consistent with the workflow’s semantics (when provided, they must match valid UUIDs for `source_seller_id`, `source_order_id`, `source_order_item_id`, `source_review_id`, `source_cancellation_request_id`, `source_refund_request_id`).
 * - Ensure `reason` is present.
 * - Validate snapshot payload content per the workflow’s snapshot payload definition (payload is stored as `shopping_mall_snapshot_payloads.payload` and must be serializable as a string).
 *
 * 2) Transactional write:
 * - Start a database transaction.
 * - Insert into `shopping_mall_snapshots` with the provided metadata, setting `created_at`/`updated_at` to current time as appropriate.
 * - Insert the 1:1 payload row into `shopping_mall_snapshot_payloads` (keyed by `shopping_mall_snapshot_id`) with the provided `payload` content.
 * - Insert visibility entries into `shopping_mall_snapshot_parties` if the request provides them; each entry sets `party_type`, `party_id`, and `can_view`. Respect unique constraint `@@unique([shopping_mall_snapshot_id, party_type, party_id])`.
 *
 * 3) Error handling:
 * - If snapshot_code uniqueness fails, return a conflict-style error.
 * - If any referenced linkage IDs are invalid (non-UUID format) or violate workflow rules, reject the request.
 * - If any insert fails, roll back the transaction and return an error; do not create partial snapshot metadata without payload.
 *
 * 4) Response:
 * - After commit, return the created snapshot resource (metadata plus any fields expected by IShoppingMallSnapshot).
 *
 * Security/authorization:
 * - Only authorized server-side workflows or privileged actors should be able to create snapshots, because snapshot content affects dispute resolution visibility.
 *
 * Edge cases:
 * - Do not allow requests that would cause misleading snapshots: business workflows must ensure edits succeeded before calling this endpoint.
 * @path /shoppingMall/admin/snapshots
 * @accessor api.functional.shoppingMall.admin.snapshots.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Creation request for an immutable snapshot capturing a point-in-time state of a domain entity. The request contains snapshot metadata for shopping_mall_snapshots and the serialized snapshot payload for shopping_mall_snapshot_payloads, along with optional visibility party links for shopping_mall_snapshot_parties.
     */
    body: IShoppingMallSnapshot.ICreate;
  };
  export type Body = IShoppingMallSnapshot.ICreate;
  export type Response = IShoppingMallSnapshot;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/admin/snapshots",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/admin/snapshots";
  export const random = (): IShoppingMallSnapshot =>
    typia.random<IShoppingMallSnapshot>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
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
 * Retrieve a paginated set of snapshot metadata records using complex filtering criteria.
 *
 * This endpoint is intended for dispute resolution and audit history views by allowing authorized parties to browse snapshot records created to preserve point-in-time states of editable domain concepts. The underlying storage is the generic immutable snapshot metadata model (`shopping_mall_snapshots`), which records the snapshot’s `source_type`, linkage keys (e.g., `source_entity_id`, and optional `source_order_id`, `source_order_item_id`, `source_review_id`), creator/member reference (`created_by_member_id`), business `reason`, and timestamps (`created_at`, `updated_at`).
 *
 * Snapshot content is stored separately from metadata in `shopping_mall_snapshot_payloads` (1:1 with `shopping_mall_snapshots`) so that browsing can be optimized: list/search calls can return metadata summaries first, while deeper payload retrieval can be performed by related operations in the system when required.
 *
 * Visibility is enforced using `shopping_mall_snapshot_parties`. Each snapshot has an explicit set of parties with `can_view`; only rows with `can_view = true` are eligible for viewing by the requesting party. This ensures that owners and administrators see only the snapshots they are permitted to access.
 *
 * Validation and behavior: the operation must support pagination and sorting so that clients can safely browse potentially large historical datasets. It must treat snapshot records as immutable; this operation only reads metadata and must not modify any snapshot row contents.
 *
 * Related operations: this endpoint is typically used together with (1) a dedicated snapshot detail retrieval operation to fetch full metadata and (when applicable) its payload, and (2) entity-specific edit operations that create snapshots after successful edits to preserve before/after truth for dispute resolution.
 *
 * @param props.connection
 * @param props.body Snapshot browsing criteria including pagination/sorting and optional filters for snapshot source/linkage fields.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implement snapshot browsing as a collection-level
 *   query over `shopping_mall_snapshots`.
 *
 * 1) Parse request body criteria (filtering, search keywords, date range, and optional linkage filters such as `source_type`, `source_entity_id`, `source_order_id`, `source_order_item_id`, `source_review_id`).
 * 2) Build a base query selecting snapshot metadata fields needed by `IShoppingMallSnapshot.ISummary`.
 * 3) Enforce visibility:
 *    - Join or subquery against `shopping_mall_snapshot_parties` on `shopping_mall_snapshot_id`.
 *    - Apply `can_view = true` and match the requesting party reference (owner/admin discriminator and party_id) according to the system’s actor mapping.
 * 4) Apply pagination and sorting from the request body.
 * 5) Execute in a single read transaction (no writes).
 * 6) Return `IPageIShoppingMallSnapshot.ISummary` containing `pagination` and `data`.
 *
 * Edge cases:
 * - If no snapshots match criteria or visibility, return an empty `data` list with valid pagination metadata.
 * - Never return snapshot payload content in this list response if the response type is a summary.
 *
 * Snapshot integrity:
 * - Do not perform any mutation. Snapshot records are immutable; no update/delete logic is allowed in this handler.
 * @path /shoppingMall/admin/snapshots
 * @accessor api.functional.shoppingMall.admin.snapshots.index
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
     * Snapshot browsing criteria including pagination/sorting and optional filters for snapshot source/linkage fields.
     */
    body: IShoppingMallSnapshot.IRequest;
  };
  export type Body = IShoppingMallSnapshot.IRequest;
  export type Response = IPageIShoppingMallSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/snapshots",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/admin/snapshots";
  export const random = (): IPageIShoppingMallSnapshot.ISummary =>
    typia.random<IPageIShoppingMallSnapshot.ISummary>();
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
 * Retrieve a specific snapshot for dispute resolution by snapshot identifier.
 *
 * This operation returns the immutable record stored in `shopping_mall_snapshots`, including its metadata such as `snapshot_code`, `source_type`, the linkage keys (`source_entity_id`, and optional linkage fields like `source_order_id`, `source_order_item_id`, `source_review_id`, `source_cancellation_request_id`, `source_refund_request_id`, `source_seller_id`), the change reason (`reason`), and timestamps (`created_at`, `updated_at`). If the snapshot has associated content, it is attached via the 1:1 relationship to `shopping_mall_snapshot_payloads`.
 *
 * Authorization is enforced using `shopping_mall_snapshot_parties`. A request is considered viewable only when there exists a visibility relationship for the caller’s party identity where `can_view = true` and the visibility row is not treated as removed (i.e., the visibility row’s `deleted_at` must be null). Administrators can view snapshots for any product and the system must still allow viewing even if the originating product has been deleted.
 *
 * If a user attempts to view a snapshot without the required visibility rights, the system must reject the request and must not reveal snapshot details. The system must also avoid disclosing whether the snapshot exists in a way that could help an unauthorized caller enumerate snapshot identifiers; it should return an unsuccessful result without exposing snapshot existence beyond what is necessary for safe operation.
 *
 * This endpoint is read-only. Snapshots are immutable: they cannot be deleted or altered. Attempting to modify snapshot records is handled by other operations (which must be rejected); this operation only reads and returns existing snapshot data.
 *
 * Related operations: for listing or searching snapshots, the platform may provide other endpoints (not defined here). For dispute timelines, consumers typically retrieve the snapshot by ID and then use the immutable before/after values present in the snapshot payload content.
 *
 * @param props.connection
 * @param props.snapshotId Target snapshot identifier (UUID) for the immutable snapshot record to view.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Implementation steps: 1) Authenticate the caller and
 *   resolve their party identity used for
 *   `shopping_mall_snapshot_parties.party_type` and `party_id`. 2) Fetch the
 *   snapshot metadata from `shopping_mall_snapshots` by `id = snapshotId`. 3)
 *   Enforce viewability: - Determine whether a matching row exists in
 *   `shopping_mall_snapshot_parties` for the same `shopping_mall_snapshot_id`
 *   and caller identity where `can_view = true` and `deleted_at` is null. -
 *   Treat absence of a viewable party relationship as access denied. -
 *   Additionally, ensure administrator visibility rules are applied
 *   consistently with how admin parties are represented in
 *   `shopping_mall_snapshot_parties`. 4) If the snapshot is not found OR access
 *   is not viewable, return an unsuccessful result in a way that does not leak
 *   existence details (e.g., a generic forbidden/not-found-equivalent error).
 *   5) If viewable, load the optional `shopping_mall_snapshot_payloads` record
 *   via the 1:1 relation `shopping_mall_snapshots.payload`. 6) Construct the
 *   response DTO `IShoppingMallSnapshot` from snapshot metadata and (when
 *   present) payload content.
 *
 * Database access considerations:
 * - Use a single transaction-free read (no write).
 * - Join or perform two queries (snapshot + payload) after authorization check, to avoid exposing payload content to unauthorized callers.
 *
 * Edge cases:
 * - If payload does not exist (payload relationship is null), return snapshot metadata with payload fields as defined by `IShoppingMallSnapshot`.
 * - If visibility exists but `can_view` is false or the visibility row is logically removed (`deleted_at` is not null), treat as unauthorized.
 * - Avoid returning different error messages/status codes that would allow ID enumeration; align to the platform’s generic denial behavior for unauthorized snapshot access.
 * @path /shoppingMall/admin/snapshots/:snapshotId
 * @accessor api.functional.shoppingMall.admin.snapshots.at
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
     * Target snapshot identifier (UUID) for the immutable snapshot record to view.
     */
    snapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/admin/snapshots/:snapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}`;
  export const random = (): IShoppingMallSnapshot =>
    typia.random<IShoppingMallSnapshot>();
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
      assert.param("snapshotId")(() => typia.assert(props.snapshotId));
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
 * Retrieve an immutable snapshot history timeline used for audit and dispute resolution.
 *
 * This operation queries `shopping_mall_snapshots`, which represents generic immutable snapshot records for multiple editable concepts (captured via `source_type` and `source_entity_id`). Each returned history item is identified by `snapshot_code` and includes historical ordering through `created_at` (and `updated_at` metadata).
 *
 * This endpoint is intended for consumers who need to browse snapshot events connected to a particular business concept (for example, a product, product variant, review, cancellation request, or refund request). The query can be scoped using the snapshot linkage columns in `shopping_mall_snapshots`, including optional `source_seller_id`, `source_order_id`, `source_order_item_id`, `source_review_id`, `source_cancellation_request_id`, and `source_refund_request_id`.
 *
 * Security and visibility are enforced using the snapshot visibility relationships stored in `shopping_mall_snapshot_parties`. A consumer must only receive snapshots for which they have `can_view = true` according to the matching `party_type` and `party_id` stored in `shopping_mall_snapshot_parties`.
 *
 * Validation rules:
 *
 * - The request must include pagination and optional filter fields, and the service must apply them against `shopping_mall_snapshots.created_at` (and other linkage fields) to produce deterministic ordering.
 * - If a filter references a specific linkage key (e.g., `source_order_item_id`), the service must constrain results accordingly.
 *
 * Error handling:
 *
 * - If no snapshots match the filters or visibility constraints, return an empty paginated result set.
 * - If required filter shape is invalid (e.g., malformed identifiers), respond with a standard request validation error (HTTP 400).
 *
 * Related operations:
 *
 * - Snapshot data retrieval for specific domains should be implemented as separate endpoints (e.g., owner/admin snapshot viewing endpoints) that leverage the same snapshot visibility rules. This history query returns list-friendly snapshot metadata rather than requiring domain-specific joins.
 *
 *
 * @param props.connection
 * @param props.body History query criteria for filtering snapshot records by source type and linkage identifiers, with pagination and sorting.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification Query `shopping_mall_snapshots` as the main history
 *   table.
 *
 * Implementation steps:
 * 1) Parse requestBody filters (sourceType, optional sourceEntityId, optional linkage ids: sourceSellerId/sourceOrderId/sourceOrderItemId/sourceReviewId/sourceCancellationRequestId/sourceRefundRequestId) and pagination/sorting options.
 * 2) Determine the calling party identity (owner or admin) at the service/middleware level, then enforce visibility:
 *    - Join/exists-check `shopping_mall_snapshot_parties` where:
 *      - shopping_mall_snapshot_parties.shopping_mall_snapshot_id = shopping_mall_snapshots.id
 *      - shopping_mall_snapshot_parties.can_view = true
 *      - shopping_mall_snapshot_parties.party_type matches the caller party discriminator
 *      - shopping_mall_snapshot_parties.party_id matches the caller party id
 *    - Also treat any rows with `deleted_at` in snapshot metadata or party relationship as not eligible for viewing.
 * 3) Apply filters on `shopping_mall_snapshots.source_type` and any provided linkage columns. Use indexes where available: `source_seller_id`/`source_order_item_id` with `created_at`, and the unique/indexed fields.
 * 4) Order by `shopping_mall_snapshots.created_at` descending by default; apply request sorting overrides only on allowed fields (to keep deterministic pagination).
 * 5) Pagination:
 *    - Return cursor/page-size results as defined by the IRequest DTO.
 * 6) Response mapping:
 *    - Populate list summary fields from snapshot metadata: id, snapshot_code, source_type, source_entity_id, reason, created_at, and any provided linkage ids.
 *    - Do not inline large payload content; payload is stored in `shopping_mall_snapshot_payloads` (1:1 optional) and should be fetched only by dedicated payload endpoints if needed.
 * 7) Edge cases:
 *    - When filters are omitted, default to latest snapshots visible to the caller.
 *    - When filters are provided but caller visibility disallows them, return empty results.
 *
 * No transactions are required because this is a read operation.
 *
 * @path /shoppingMall/admin/snapshots/history
 * @accessor api.functional.shoppingMall.admin.snapshots.history
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function history(
  connection: IConnection,
  props: history.Props,
): Promise<history.Response> {
  return true === connection.simulate
    ? history.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...history.METADATA,
          path: history.path(),
          status: null,
        },
        props.body,
      );
}
export namespace history {
  export type Props = {
    /**
     * History query criteria for filtering snapshot records by source type and linkage identifiers, with pagination and sorting.
     */
    body: IShoppingMallSnapshot.IRequest;
  };
  export type Body = IShoppingMallSnapshot.IRequest;
  export type Response = IPageIShoppingMallSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/snapshots/history",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/admin/snapshots/history";
  export const random = (): IPageIShoppingMallSnapshot.ISummary =>
    typia.random<IPageIShoppingMallSnapshot.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: history.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: history.path(),
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
