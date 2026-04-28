import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IPageIShoppingMallReviewSnapshot } from "../../../../../../api/structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallReviewSnapshot } from "../../../../../../api/structures/IShoppingMallReviewSnapshot";
import { AdminAuth } from "../../../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../../../decorators/payload/AdminPayload";
import { getShoppingMallAdminProductsProductIdReviewsReviewIdSnapshotsSnapshotId } from "../../../../../../providers/getShoppingMallAdminProductsProductIdReviewsReviewIdSnapshotsSnapshotId";
import { patchShoppingMallAdminProductsProductIdReviewsReviewIdSnapshots } from "../../../../../../providers/patchShoppingMallAdminProductsProductIdReviewsReviewIdSnapshots";

@Controller(
  "/shoppingMall/admin/products/:productId/reviews/:reviewId/snapshots",
)
export class ShoppingmallAdminProductsReviewsSnapshotsController {
  /**
   * Retrieve the complete chronological snapshot history of a specific product review.
   *
   * This operation returns a paginated list of all immutable historical snapshots associated with a given review (identified by `reviewId`) on a given product (identified by `productId`). Each snapshot in the `shopping_mall_review_snapshots` table represents the exact state of the review — its star rating and optional text body — at a specific moment in time. A new snapshot is appended automatically each time the customer edits the review, preserving a full audit trail of all changes made since the review was first submitted.
   *
   * Snapshots are entirely immutable once created. No user — including the authoring customer, any seller, or any administrator — may modify or remove a snapshot after it has been recorded. This immutability guarantees that snapshots remain trustworthy records for dispute resolution and platform integrity checks.
   *
   * Access to this endpoint is role-scoped. A customer may retrieve snapshots only for reviews they authored. A seller may retrieve snapshot histories for reviews that have been posted on their own products. Administrators and super-administrators have unrestricted access to the snapshot history of any review on the platform, supporting their dispute resolution responsibilities.
   *
   * Deleted reviews still retain their snapshot history. When a review has been marked as deleted (its `deleted_at` field is non-null in `shopping_mall_reviews`), the snapshots remain accessible to administrators for audit and compliance purposes, even though the review itself is hidden from public-facing product pages. Similarly, if the customer who authored the review has deleted their account, the snapshots tied to that review are preserved and remain accessible to administrators.
   *
   * The `productId` path parameter must correspond to an existing product in the `shopping_mall_products` table. The `reviewId` path parameter must correspond to an existing review in `shopping_mall_reviews` that belongs to the given product (i.e., `shopping_mall_reviews.product_id` matches `productId`). If either identifier does not resolve correctly, the request is rejected with a not-found error.
   *
   * Results are returned in chronological order by `created_at`, allowing callers to trace the full edit history from the earliest snapshot (the review's initial submission) through to the most recent version. Pagination is supported via standard page/limit parameters in the request body.
   *
   * @param connection
   * @param productId The UUID of the product being reviewed. Used to scope the review lookup to a specific product in the shopping_mall_products table.
   * @param reviewId The UUID of the review whose snapshot history is being retrieved. Must belong to the product identified by productId, as stored in the shopping_mall_reviews table.
   * @param body Pagination and filtering criteria for the review snapshot list.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification 1. Authenticate the caller and determine their
     *   role (customer, seller, admin, superAdmin). 2. Resolve the product:
     *   query shopping_mall_products by productId. Return 404 if not found or
     *   deleted. 3. Resolve the review: query shopping_mall_reviews by reviewId
     *   WHERE product_id = productId. Return 404 if not found. 4. Enforce
     *   access control: - If caller is a customer: verify
     *   shopping_mall_reviews.customer_id matches the authenticated customer's
     *   ID. Return 403 if not. - If caller is a seller: verify that the product
     *   (shopping_mall_products.shopping_mall_seller_id) belongs to the
     *   authenticated seller. Return 403 if not. - If caller is admin or
     *   superAdmin: allow access unconditionally, including to reviews with
     *   deleted_at set. 5. Query shopping_mall_review_snapshots WHERE
     *   shopping_mall_review_id = reviewId. 6. Apply any filtering criteria
     *   from the request body (e.g., created_at date range). 7. Order results
     *   by created_at ASC (chronological order). 8. Apply pagination (page
     *   number and page size) from the request body. 9. Return a paginated
     *   response with total count, current page info, and the list of snapshot
     *   summaries (id, rating, body, created_at). 10. Note: snapshots must
     *   never be filtered out regardless of the review's deleted_at status when
     *   the caller is an admin or superAdmin — full history must always be
     *   available to them.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("reviewId")
    reviewId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallReviewSnapshot.IRequest,
  ): Promise<IPageIShoppingMallReviewSnapshot.ISummary> {
    try {
      return await patchShoppingMallAdminProductsProductIdReviewsReviewIdSnapshots(
        {
          admin,
          productId,
          reviewId,
          body,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single immutable review snapshot identified by its unique ID.
   *
   * This endpoint returns the full detail of one `shopping_mall_review_snapshots` record. Each review snapshot is an immutable point-in-time capture of a review's content — specifically its star rating (an integer from 1 to 5) and optional free-text body — recorded either at the moment the review was first submitted or immediately before each subsequent edit. Snapshots are append-only and can never be modified or removed after creation, making them the authoritative audit trail for a review's history.
   *
   * The path is structured as `/products/{productId}/reviews/{reviewId}/snapshots/{snapshotId}`, reflecting the ownership hierarchy defined in the database schema: a `shopping_mall_review_snapshots` record belongs to a `shopping_mall_reviews` record, which in turn is anchored to a `shopping_mall_products` record. All three path parameters must correctly correspond to their respective entities, and the system validates each relationship in sequence.
   *
   * Access control is strictly enforced. Authenticated customers may retrieve snapshots only for their own reviews, and only while those reviews are not deleted. Once a customer has deleted their own review, the review is no longer part of their accessible history and its snapshots become inaccessible to them. Administrators (admin and superAdmin) have unrestricted access to any snapshot on the platform, including snapshots belonging to deleted reviews or accounts of deleted customers, in support of the platform's dispute resolution processes. Sellers and unauthenticated guests are denied access under all circumstances.
   *
   * To enumerate all available snapshots for a review, call `PATCH /products/{productId}/reviews/{reviewId}/snapshots` first to obtain the list of snapshot IDs and their metadata, then use this endpoint to retrieve the full detail of any individual snapshot of interest.
   *
   * @param connection
   * @param productId The UUID of the product that the target review belongs to.
   * @param reviewId The UUID of the review that the target snapshot belongs to.
   * @param snapshotId The UUID of the review snapshot to retrieve.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor admin
     * @x-autobe-specification Implementation steps:
   *
   * 1. Validate path parameters: productId, reviewId, snapshotId must each be valid UUIDs.
   *
   * 2. Verify the product exists in `shopping_mall_products` by productId. If not found (or deleted_at is non-null for customer actors), return 404.
   *
   * 3. Verify the review exists in `shopping_mall_reviews` where id = reviewId AND product_id = productId. If not found, return 404. For customer actors, additionally check that deleted_at IS NULL (deleted reviews are inaccessible to customers per section 416). For admin/superAdmin actors, deleted reviews are still accessible.
   *
   * 4. Authorization check:
   *    - If the caller is a customer: verify that `shopping_mall_reviews.customer_id` matches the authenticated customer's id. If not, return 403. If the review is deleted (deleted_at IS NOT NULL), return 404 (review no longer part of their accessible history).
   *    - If the caller is an admin or superAdmin: allow access unconditionally.
   *    - If the caller is a seller or guest: return 403.
   *
   * 5. Query `shopping_mall_review_snapshots` where id = snapshotId AND shopping_mall_review_id = reviewId. If not found, return 404.
   *
   * 6. Return the snapshot record: id, shopping_mall_review_id, rating (1–5 integer), body (nullable string), created_at.
   *
   * Edge cases:
   * - snapshotId belongs to a different review than reviewId → 404.
   * - reviewId belongs to a different product than productId → 404.
   * - Customer tries to access another customer's review snapshot → 403.
   * - Customer tries to access snapshot of their own deleted review → 404.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":snapshotId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("reviewId")
    reviewId: string & tags.Format<"uuid">,
    @TypedParam("snapshotId")
    snapshotId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallReviewSnapshot> {
    try {
      return await getShoppingMallAdminProductsProductIdReviewsReviewIdSnapshotsSnapshotId(
        {
          admin,
          productId,
          reviewId,
          snapshotId,
        },
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
