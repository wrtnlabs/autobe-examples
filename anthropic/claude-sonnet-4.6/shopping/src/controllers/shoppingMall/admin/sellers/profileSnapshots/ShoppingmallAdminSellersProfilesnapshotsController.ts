import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallSellerProfileSnapshot } from "../../../../../api/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSellerProfileSnapshot } from "../../../../../api/structures/IShoppingMallSellerProfileSnapshot";
import { AdminAuth } from "../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../decorators/payload/AdminPayload";
import { getShoppingMallAdminSellersSellerIdProfileSnapshotsSnapshotId } from "../../../../../providers/getShoppingMallAdminSellersSellerIdProfileSnapshotsSnapshotId";
import { patchShoppingMallAdminSellersSellerIdProfileSnapshots } from "../../../../../providers/patchShoppingMallAdminSellersSellerIdProfileSnapshots";

@Controller("/shoppingMall/admin/sellers/:sellerId/profileSnapshots")
export class ShoppingmallAdminSellersProfilesnapshotsController {
  /**
   * Retrieve a paginated and searchable list of immutable profile snapshots for a specific seller account, accessible to platform administrators only.
   *
   * Every time a seller edits their shop profile — whether modifying the shop name, shop description, or logo image — the system automatically records the prior state as an immutable snapshot in the `shopping_mall_seller_profile_snapshots` table. This operation exposes that chronological audit trail, enabling administrators to audit profile changes across any seller account on the platform.
   *
   * The `sellerId` path parameter identifies the target seller by their UUID primary key in `shopping_mall_sellers`. This endpoint supports pagination to handle sellers with extensive edit histories, as well as optional filtering by shop name text and snapshot creation date range.
   *
   * Access is restricted to regular administrators and super administrators only. Customers, sellers, and unauthenticated guests are denied access entirely. Administrators may retrieve snapshots for any seller regardless of the seller's current account state — including accounts that are banned, suspended, or have been logically removed (i.e., where `deleted_at` is set on the `shopping_mall_sellers` record). This unrestricted access supports platform-wide oversight, compliance review, and dispute resolution.
   *
   * Profile snapshots are permanently preserved and cannot be modified or deleted by any actor. Each snapshot record is immutable once written, capturing the exact `shop_name`, `shop_description`, and `logo_url` as they existed at the moment of the edit. The snapshots are indexed by `(seller_id, created_at)` to support efficient time-ordered queries.
   *
   * This operation is typically used in conjunction with the seller detail endpoint to obtain the current seller profile, while this endpoint provides the complete historical record of past profile states. It is also relevant when reviewing order item snapshots, since each order item embeds the seller's profile snapshot as it existed at the time of purchase — making this history useful for dispute resolution between customers and sellers.
   *
   * @param connection
   * @param sellerId The UUID of the target seller whose profile snapshots are being listed. Must refer to an existing seller account.
   * @param body Pagination, sorting, and optional search criteria for filtering the seller's profile snapshot history.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Authenticate the requesting actor. Verify the
     *   actor is either: a. The seller identified by {sellerId} (sellers may
     *   only view their own snapshots), or b. A regular admin or super admin
     *   (may view any seller's snapshots). Reject with 403 if the actor is a
     *   customer, guest, or a different seller.
   *
   * 2. Validate that a seller with id = {sellerId} exists in shopping_mall_sellers. Return 404 if not found. Deleted sellers (deleted_at IS NOT NULL) should still be accessible to admins for audit purposes.
   *
   * 3. Query shopping_mall_seller_profile_snapshots WHERE seller_id = {sellerId}.
   *
   * 4. Apply optional search filters from the request body:
   *    - shop_name: partial text match using trigram index (gin_trgm_ops on shop_name column)
   *    - created_at range: filter by created_at >= fromDate and/or created_at <= toDate
   *
   * 5. Apply sorting (default: created_at DESC).
   *
   * 6. Apply pagination using standard cursor/offset-based pagination parameters from the request body.
   *
   * 7. Return the paginated result as IPageIShoppingMallSellerProfileSnapshot.ISummary containing:
   *    - pagination metadata (total count, current page, page size, etc.)
   *    - data array of snapshot summaries (id, seller_id, shop_name, shop_description, logo_url, created_at)
   *
   * 8. Note: Suspended sellers (is_suspended = true) are still permitted to view their own profile snapshots per requirements section 335.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallSellerProfileSnapshot.IRequest,
  ): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
    try {
      return await patchShoppingMallAdminSellersSellerIdProfileSnapshots({
        admin,
        sellerId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific seller profile snapshot by its unique identifier.
   *
   * A seller profile snapshot (stored in `shopping_mall_seller_profile_snapshots`) is an immutable, point-in-time record that captures the exact state of a seller's public shop profile — including the shop name, shop description, and logo image URL — at the precise moment it was created. A new snapshot is automatically generated each time a seller edits any part of their shop profile, forming a tamper-proof chronological audit trail.
   *
   * This endpoint returns a single snapshot record for the seller identified by `sellerId`, identified further by the specific `snapshotId`. The snapshot fields returned include the shop name as it was at that moment, the optional shop description, the optional logo URL, and the creation timestamp. Because snapshots are immutable, the data returned by this endpoint will always be identical regardless of when it is called.
   *
   * Access to this endpoint is strictly controlled. Sellers may only retrieve snapshots belonging to their own account — a seller attempting to access another seller's snapshot will receive a denial. Regular administrators and super administrators may retrieve profile snapshots for any seller, including accounts that have been removed. Customers and unauthenticated users are not permitted to access seller profile snapshot records directly.
   *
   * This endpoint is useful for sellers reviewing the history of their own profile changes, and for administrators auditing seller profile edits for compliance or dispute resolution purposes. It also serves as a reference when tracing the seller profile state that was embedded in an order item snapshot at the time of purchase, as `shopping_mall_order_item_snapshots` references the seller profile snapshot that was active at checkout.
   *
   * @param connection
   * @param sellerId The UUID of the seller whose profile snapshot is being retrieved (global scope).
   * @param snapshotId The UUID of the specific seller profile snapshot to retrieve (scoped to the seller).
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Extract `sellerId` and `snapshotId` from the
     *   path parameters. 2. Verify that the authenticated actor is authorized:
     *   - If the actor is a seller: confirm that `sellerId` matches the
     *   authenticated seller's own ID. If not, return 403 Forbidden. - If the
     *   actor is an admin or superAdmin: allow access for any `sellerId`. - If
     *   the actor is a customer or guest: return 403 Forbidden. 3. Verify that
     *   the seller identified by `sellerId` exists in `shopping_mall_sellers`.
     *   If not found (including cases where `deleted_at` is set), return 404
     *   Not Found — admins may still access snapshots for deleted sellers, so
     *   for admin actors, skip the deleted_at exclusion filter. 4. Query
     *   `shopping_mall_seller_profile_snapshots` WHERE `id = snapshotId` AND
     *   `seller_id = sellerId`. 5. If no matching record is found, return 404
     *   Not Found. 6. Return the full snapshot record including: `id`,
     *   `seller_id`, `shop_name`, `shop_description` (nullable), `logo_url`
     *   (nullable), `created_at`. 7. No mutations are performed; this is a
     *   read-only operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallSellerProfileSnapshot> {
    try {
      return await getShoppingMallAdminSellersSellerIdProfileSnapshotsSnapshotId(
        {
          admin,
          sellerId,
          snapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
