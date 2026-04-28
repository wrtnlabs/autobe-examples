import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallReviewSnapshot } from "../../../../../../structures/IPageIShoppingMallReviewSnapshot";
import { IShoppingMallReviewSnapshot } from "../../../../../../structures/IShoppingMallReviewSnapshot";

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
 * @param props.connection
 * @param props.productId The UUID of the product being reviewed. Used to scope the review lookup to a specific product in the shopping_mall_products table.
 * @param props.reviewId The UUID of the review whose snapshot history is being retrieved. Must belong to the product identified by productId, as stored in the shopping_mall_reviews table.
 * @param props.body Pagination and filtering criteria for the review snapshot list.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor admin
 * @x-autobe-specification 1. Authenticate the caller and determine their role
 *   (customer, seller, admin, superAdmin). 2. Resolve the product: query
 *   shopping_mall_products by productId. Return 404 if not found or deleted. 3.
 *   Resolve the review: query shopping_mall_reviews by reviewId WHERE
 *   product_id = productId. Return 404 if not found. 4. Enforce access control:
 *   - If caller is a customer: verify shopping_mall_reviews.customer_id matches
 *   the authenticated customer's ID. Return 403 if not. - If caller is a
 *   seller: verify that the product
 *   (shopping_mall_products.shopping_mall_seller_id) belongs to the
 *   authenticated seller. Return 403 if not. - If caller is admin or
 *   superAdmin: allow access unconditionally, including to reviews with
 *   deleted_at set. 5. Query shopping_mall_review_snapshots WHERE
 *   shopping_mall_review_id = reviewId. 6. Apply any filtering criteria from
 *   the request body (e.g., created_at date range). 7. Order results by
 *   created_at ASC (chronological order). 8. Apply pagination (page number and
 *   page size) from the request body. 9. Return a paginated response with total
 *   count, current page info, and the list of snapshot summaries (id, rating,
 *   body, created_at). 10. Note: snapshots must never be filtered out
 *   regardless of the review's deleted_at status when the caller is an admin or
 *   superAdmin — full history must always be available to them.
 * @path /shoppingMall/admin/products/:productId/reviews/:reviewId/snapshots
 * @accessor api.functional.shoppingMall.admin.products.reviews.snapshots.index
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
     * The UUID of the product being reviewed. Used to scope the review lookup to a specific product in the shopping_mall_products table.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the review whose snapshot history is being retrieved. Must belong to the product identified by productId, as stored in the shopping_mall_reviews table.
     */
    reviewId: string & tags.Format<"uuid">;

    /**
     * Pagination and filtering criteria for the review snapshot list.
     */
    body: IShoppingMallReviewSnapshot.IRequest;
  };
  export type Body = IShoppingMallReviewSnapshot.IRequest;
  export type Response = IPageIShoppingMallReviewSnapshot.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/admin/products/:productId/reviews/:reviewId/snapshots",
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
    `/shoppingMall/admin/products/${encodeURIComponent(props.productId ?? "null")}/reviews/${encodeURIComponent(props.reviewId ?? "null")}/snapshots`;
  export const random = (): IPageIShoppingMallReviewSnapshot.ISummary =>
    typia.random<IPageIShoppingMallReviewSnapshot.ISummary>();
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
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("reviewId")(() => typia.assert(props.reviewId));
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
 * @param props.connection
 * @param props.productId The UUID of the product that the target review belongs to.
 * @param props.reviewId The UUID of the review that the target snapshot belongs to.
 * @param props.snapshotId The UUID of the review snapshot to retrieve.
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
 * @path /shoppingMall/admin/products/:productId/reviews/:reviewId/snapshots/:snapshotId
 * @accessor api.functional.shoppingMall.admin.products.reviews.snapshots.at
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
     * The UUID of the product that the target review belongs to.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the review that the target snapshot belongs to.
     */
    reviewId: string & tags.Format<"uuid">;

    /**
     * The UUID of the review snapshot to retrieve.
     */
    snapshotId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallReviewSnapshot;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/admin/products/:productId/reviews/:reviewId/snapshots/:snapshotId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/admin/products/${encodeURIComponent(props.productId ?? "null")}/reviews/${encodeURIComponent(props.reviewId ?? "null")}/snapshots/${encodeURIComponent(props.snapshotId ?? "null")}`;
  export const random = (): IShoppingMallReviewSnapshot =>
    typia.random<IShoppingMallReviewSnapshot>();
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
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("reviewId")(() => typia.assert(props.reviewId));
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
