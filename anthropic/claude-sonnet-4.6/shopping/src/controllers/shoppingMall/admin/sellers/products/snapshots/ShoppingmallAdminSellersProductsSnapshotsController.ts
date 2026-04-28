import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductSnapshot } from "../../../../../../api/structures/IPageIShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshot } from "../../../../../../api/structures/IShoppingMallProductSnapshot";
import { AdminAuth } from "../../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../../decorators/payload/AdminPayload";
import { getShoppingMallAdminSellersSellerIdProductsProductIdSnapshotsSnapshotId } from "../../../../../../providers/getShoppingMallAdminSellersSellerIdProductsProductIdSnapshotsSnapshotId";
import { patchShoppingMallAdminSellersSellerIdProductsProductIdSnapshots } from "../../../../../../providers/patchShoppingMallAdminSellersSellerIdProductsProductIdSnapshots";

@Controller(
  "/shoppingMall/admin/sellers/:sellerId/products/:productId/snapshots",
)
export class ShoppingmallAdminSellersProductsSnapshotsController {
  /**
   * Retrieve a paginated list of product snapshots for a specific product, accessible by administrators for platform-wide oversight, audit, and dispute resolution.
   *
   * Product snapshots (`shopping_mall_product_snapshots`) are immutable, system-generated records that capture the complete state of a product at a precise point in time. Each snapshot preserves the product's `name`, `description`, `base_price`, and `category_name` as they existed at the moment of capture, along with all associated variant states (`shopping_mall_product_snapshot_skuses`) and image sequences (`shopping_mall_product_snapshot_images`). Snapshots are created automatically whenever a seller edits any editable field of a product — including name, description, category, base price, images, or variant configuration — and cannot be manually created, modified, or deleted by any user.
   *
   * This endpoint is exclusively accessible to administrators. Administrators can retrieve the complete snapshot history for any product on the platform, regardless of which seller owns or owned the product. Administrators may also access snapshots belonging to products that have been soft-deleted (i.e., where `shopping_mall_products.deleted_at` is set), enabling full historical review even after the product has been removed from the active catalog. This unrestricted access is intended to support platform-wide oversight, compliance review, and dispute resolution between customers and sellers.
   *
   * Results are returned in reverse chronological order (most recent snapshot first). The response is paginated and supports optional search filters such as date range filtering on `created_at` and keyword-based name search. Each summary record in the paginated response includes the snapshot's ID, the captured product name, base price, category name, and creation timestamp, providing enough information to identify and distinguish individual snapshot entries without loading the full detail record.
   *
   * To retrieve the complete details of a specific snapshot — including all captured variant SKUs and the ordered image list — call `GET /shoppingMall/admin/sellers/{sellerId}/products/{productId}/snapshots/{snapshotId}` with the snapshot ID obtained from this list response.
   *
   * This operation is useful for administrators who need to review a seller's product edit history, verify snapshot integrity, reference historical product states when resolving disputes, or audit the sequence and content of changes made to a product over time.
   *
   * @param connection
   * @param sellerId The UUID of the seller who owns the product. Used to scope snapshot access to a specific seller's product catalog.
   * @param productId The UUID of the product whose snapshot history is being retrieved.
   * @param body Pagination and optional filter criteria for the product snapshot list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Validate that the authenticated actor is
     *   either the seller identified by `sellerId` or an administrator. If
     *   neither, return 403 Forbidden.
   *
   * 2. Confirm that the product identified by `productId` exists in `shopping_mall_products` and that its `shopping_mall_seller_id` matches the `sellerId` path parameter. If the product does not exist (including if it has been permanently deleted and no record exists), return 404. Note: if the product has a `deleted_at` value set (soft-deleted), administrators may still access its snapshots via this endpoint; enforce this by skipping the `deleted_at` filter when the caller is an admin.
   *
   * 3. Query `shopping_mall_product_snapshots` where `product_id = productId`. Apply any optional filters from the request body:
   *    - `from` / `to` date range filter on `created_at`
   *    - `name` keyword filter using GIN trigram index on the `name` column for partial matching
   *
   * 4. Sort results by `created_at` DESC (most recent first).
   *
   * 5. Apply cursor-based or offset-based pagination using `page` and `limit` from the request body. Return a standard `IPage` envelope with `pagination` metadata and a `data` array of summary records.
   *
   * 6. Each summary record in `data` should include: `id`, `name`, `description` (truncated or omitted for list view), `base_price`, `category_name`, `created_at`. Do NOT eagerly load child `snapshotImages` or `snapshotSkuses` arrays in the list response — those are for the detail endpoint.
   *
   * 7. If no snapshots exist for the product, return an empty `data` array with appropriate pagination metadata (totalCount = 0).
   *
   * 8. Edge case: if `product_id` column in `shopping_mall_product_snapshots` is null (the product was deleted and the FK was nullified via cascade), administrators should still be able to access those snapshot records if they were previously associated with the given product. Implement this by storing the original product reference before cascade, or by using a different strategy if cascade is used — confirm the schema: the schema uses `onDelete: Cascade` on the product relation, meaning if the product is hard-deleted the snapshots would also be deleted. However, since `product_id` is nullable, the intent is that snapshots survive product deletion. The service layer should handle this by checking if snaphots exist with a null `product_id` that were originally associated with the given product ID (this may require storing the product_id at creation time). In practice, query snapshots where `product_id = productId` (including historical soft-deleted products).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductSnapshot.IRequest,
  ): Promise<IPageIShoppingMallProductSnapshot.ISummary> {
    try {
      return await patchShoppingMallAdminSellersSellerIdProductsProductIdSnapshots(
        {
          admin,
          sellerId,
          productId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the full details of a specific product snapshot belonging to a seller's product.
   *
   * A product snapshot (stored in `shopping_mall_product_snapshots`) is an immutable, point-in-time record capturing the complete state of a product at a specific moment — including the product's name, description, base price, and category association as they existed when the snapshot was taken. The snapshot also encapsulates the full set of variant SKU states (via `shopping_mall_product_snapshot_skuses`) and the complete ordered image sequence (via `shopping_mall_product_snapshot_images`), providing a self-contained historical record that cannot be altered after creation.
   *
   * Snapshots are generated automatically by the system whenever a seller edits any editable field of a product (name, description, category, base price, images, or variants), or when an order is placed referencing the product. They are never manually created by users, and once created, they are permanently immutable — no user, including the owning seller or any administrator, may modify or remove a snapshot record.
   *
   * Access to this endpoint is restricted by ownership. The authenticated seller must be the seller identified by `sellerId`, and the product identified by `productId` must belong to that seller. If either condition is not met, the request is denied. Sellers may view snapshots of their own products even after those products have been removed from the platform, since snapshots are retained independently of their parent product's lifecycle. Administrators may access this endpoint for any seller and product combination on the platform to support audit, dispute resolution, and compliance review. Customers do not have access to raw product snapshot records under any circumstances.
   *
   * This endpoint is typically used after obtaining a list of snapshot summaries via `PATCH /sellers/{sellerId}/products/{productId}/snapshots`, which returns paginated snapshot entries for a given product. The caller uses the snapshot ID from that list to retrieve the full detail here.
   *
   * @param connection
   * @param sellerId The UUID of the seller who owns the product. Used to scope and enforce ownership of the product snapshot being retrieved.
   * @param productId The UUID of the product that the snapshot belongs to. Must be owned by the seller identified by sellerId.
   * @param snapshotId The UUID of the specific product snapshot to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Validate that the authenticated actor is
     *   either the seller identified by `sellerId` OR an administrator. If the
     *   authenticated seller's ID does not match `sellerId`, return 403
     *   Forbidden. 2. Query `shopping_mall_products` to find the product with
     *   `id = productId` AND `shopping_mall_seller_id = sellerId`. If not found
     *   (or the product belongs to a different seller), return 404 Not Found.
     *   Note: products with a non-null `deleted_at` are still accessible for
     *   snapshot viewing — do NOT filter them out. 3. Query
     *   `shopping_mall_product_snapshots` for the record with `id = snapshotId`
     *   AND `product_id = productId`. If no such snapshot exists, return 404
     *   Not Found. 4. Eagerly load all child records for the snapshot: -
     *   `shopping_mall_product_snapshot_skuses` where `product_snapshot_id =
     *   snapshotId`, ordered by `created_at` ASC. - For each snapshot SKU,
     *   eagerly load `shopping_mall_product_snapshot_skus_options` ordered by
     *   `sequence` ASC. - `shopping_mall_product_snapshot_images` where
     *   `product_snapshot_id = snapshotId`, ordered by `sequence` ASC. 5.
     *   Construct and return the full `IShoppingMallProductSnapshot` DTO
     *   including: id, product_id, category_id, category_name, name,
     *   description, base_price, created_at, an array of snapshot SKUs (each
     *   with id, sku_code, price, product_variant_id, created_at, and options
     *   array), and an ordered array of snapshot images (each with id, url,
     *   sequence, created_at). 6. No write, update, or delete operations are
     *   performed. This is a pure read operation. 7. Edge cases: if the
     *   snapshot's `product_id` is null (product was deleted and FK was set to
     *   null), verify ownership via the `sellerId` path parameter against the
     *   snapshot's originating product — or rely on the admin path for such
     *   cases. In practice, for seller access, the product record (even if
     *   deleted) should still be queriable for the ownership check.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("sellerId")
    sellerId: string & tags.Format<"uuid">,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallProductSnapshot> {
    try {
      return await getShoppingMallAdminSellersSellerIdProductsProductIdSnapshotsSnapshotId(
        {
          admin,
          sellerId,
          productId,
          snapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
