import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallSnapshot } from "../../../../../api/structures/IShoppingMallSnapshot";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { patchShoppingMallAdminSnapshotsLookupByCode } from "../../../../../providers/patchShoppingMallAdminSnapshotsLookupByCode";

@Controller("/shoppingMall/admin/snapshots/lookup-by-code")
export class ShoppingmallAdminSnapshotsLookup_by_codeController {
  /**
   * Lookup an immutable snapshot record by its human-readable snapshot code.
   *
   * This operation is intended for dispute resolution and audit/history views where users need to retrieve the exact point-in-time state of editable business data. The platform stores immutable snapshots in `shopping_mall_snapshots`, identified by `snapshot_code` and typed by `source_type` (e.g., product, product_variant, order_item, review, cancellation_request, refund_request). The system also captures immutable, denormalized content in related payload tables such as `shopping_mall_snapshot_payloads` and controls view permissions for each snapshot via `shopping_mall_snapshot_parties`.
   *
   * Authorization is enforced using the snapshot’s visibility entries in `shopping_mall_snapshot_parties` (`party_type`, `party_id`, `can_view`). Only parties with `can_view = true` for the requested snapshot should be able to view the snapshot details (including payload). If no visibility entry grants access, the request must be rejected even if `snapshot_code` exists.
   *
   * If a matching snapshot exists, the response returns snapshot metadata (including `source_type`, `source_entity_id`, optional `source_*` linkage fields, `reason`, and `created_at`). If a payload record exists in `shopping_mall_snapshot_payloads` (1:1 by `shopping_mall_snapshot_id`), the response includes the stored `payload`. The operation must also ignore snapshot metadata/party/payload rows that are marked as deleted via their `deleted_at` columns.
   *
   * Related operations:
   *
   * - Snapshot viewing should be complemented by other domain-specific read operations (e.g., order item / review reads), but this endpoint specifically returns the immutable audit snapshot.
   * - Snapshot creation/edit operations are intentionally not exposed here; immutable snapshots are treated as historical records.
   *
   * Expected behavior:
   *
   * - If `snapshot_code` is not found (or only exists in records marked deleted), return a not-found error.
   * - If snapshot exists but the caller does not have view permission via `shopping_mall_snapshot_parties`, return an authorization/forbidden error.
   * - If payload is absent, return snapshot metadata without payload rather than failing.
   *
   * @param connection
   * @param body Lookup criteria for retrieving a snapshot by its snapshot_code.
   *
   *             This operation expects the client to provide the snapshot’s human-readable code that uniquely identifies a row in `shopping_mall_snapshots` via `snapshot_code`.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement PATCH /snapshots/lookup-by-code as follows:
   *
   * 1) Validate request body contains `snapshotCode` (non-empty string).
   * 2) Query `shopping_mall_snapshots` by `snapshot_code = :snapshotCode` and `deleted_at IS NULL`.
   *    - Select: id, snapshot_code, source_type, source_entity_id, source_seller_id, source_order_id, source_order_item_id, source_review_id, source_cancellation_request_id, source_refund_request_id, created_by_member_id, reason, created_at, updated_at.
   * 3) If not found, throw NotFound.
   * 4) Authorization:
   *    - Determine caller identity and party type mapping from request context.
   *    - Query `shopping_mall_snapshot_parties` for the snapshot id with `deleted_at IS NULL` and `can_view = true`.
   *    - Filter to entries matching the caller’s party_type/party_id (mapping depends on auth layer).
   *    - If no matching visibility row, throw Forbidden.
   * 5) Payload:
   *    - Left join or separate query to `shopping_mall_snapshot_payloads` where `shopping_mall_snapshot_id = snapshot.id` and `deleted_at IS NULL`.
   *    - If payload exists, include `payload`.
   * 6) Response mapping:
   *    - Map snapshot core fields.
   *    - Include an array of snapshot parties only if required by the DTO; otherwise keep it minimal.
   * 7) Transaction:
   *    - Read-only operation; no transaction required beyond consistent read.
   *
   * Edge cases:
   * - If snapshot exists but payload row is missing, still return snapshot metadata.
   * - If multiple payload rows exist despite schema expectations, return the newest by created_at and log an internal warning.
   * - Do not create or modify snapshots in this endpoint.
   * - Never use snapshot mutation logic; snapshots are immutable (do not update payload).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async lookupByCode(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: IShoppingMallSnapshot.IRequest,
  ): Promise<IShoppingMallSnapshot> {
    try {
      return await patchShoppingMallAdminSnapshotsLookupByCode({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
