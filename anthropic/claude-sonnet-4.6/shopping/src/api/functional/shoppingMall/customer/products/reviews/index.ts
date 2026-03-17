import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallReview } from "../../../../../structures/IShoppingMallReview";

export * as snapshots from "./snapshots/index";

/**
 * Submit a purchase-verified customer review for a specific product.
 *
 * This operation allows an authenticated customer to post a review for a product they have purchased and received. Each review is strictly anchored to a specific `shopping_mall_order_items` record by the `order_item_id` field in the request body. The database enforces a unique constraint on `order_item_id`, meaning each order item may have at most one review. This guarantees that all reviews are purchase-verified and prevents duplicate reviews for the same purchase.
 *
 * The review requires a mandatory star rating expressed as an integer from 1 (worst) to 5 (best), and an optional free-text body. If the customer does not wish to provide written feedback, the body field may be omitted or set to null, resulting in a rating-only review. The product being reviewed is identified by the `productId` path parameter, which corresponds to the `shopping_mall_reviews.product_id` foreign key referencing `shopping_mall_products.id`.
 *
 * Upon successful creation, the system automatically generates the first `shopping_mall_review_snapshots` record, capturing the initial rating and body content as an immutable point-in-time state. This snapshot record serves as the baseline for the review's audit history and is used for dispute resolution by administrators.
 *
 * The newly created review immediately contributes to the product's average rating calculation. The product's average star rating is recalculated to include this new review, and the total non-deleted review count is incremented. If this is the product's first review, the average rating becomes visible on the product detail page and in listing views.
 *
 * Only authenticated customers may call this endpoint. The customer identity is resolved from the active session. The order item referenced by `order_item_id` must belong to the authenticated customer and must be in `delivered` status — verifying that the customer has actually received the product before leaving feedback. The `productId` in the path must also match the product associated with the specified order item.
 *
 * Related operations: Use `PATCH /products/{productId}/reviews` to retrieve the paginated list of reviews for this product. Use `GET /products/{productId}/reviews/{reviewId}` to retrieve the detail of a specific review. Use `PUT /products/{productId}/reviews/{reviewId}` to edit an existing review. Use `DELETE /products/{productId}/reviews/{reviewId}` to remove a review.
 *
 * @param props.connection
 * @param props.productId The unique identifier (UUID) of the product to review.
 * @param props.body Review creation data including the qualifying order item, star rating, and optional text body.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Authenticate the request and resolve the current customer from the session. Return 401 if unauthenticated.
 * 2. Validate that the `productId` path parameter corresponds to an existing, non-deleted product in `shopping_mall_products`. Return 404 if not found or deleted.
 * 3. Validate the request body:
 *    a. `order_item_id` must reference an existing `shopping_mall_order_items` record.
 *    b. The order item must belong to an order owned by the authenticated customer. Return 403 if not.
 *    c. The order item's `status` must be `delivered`. Return 422 if the item has not been delivered yet.
 *    d. The order item's `shopping_mall_product_variant_id` must belong to the product identified by `productId`. Return 422 if the product does not match.
 *    e. No existing non-deleted review may exist for the same `order_item_id` (enforced by unique constraint). Return 409 if a review already exists for this order item.
 *    f. `rating` must be an integer between 1 and 5 inclusive. Return 422 if out of range.
 *    g. `body` is optional; if provided, it should be a non-empty string.
 * 4. Within a single database transaction:
 *    a. Insert a new record into `shopping_mall_reviews` with: a new UUID id, `customer_id` from session, `product_id` from path param, `order_item_id` from body, `rating` from body, `body` from body (nullable), `created_at` and `updated_at` set to current timestamp, `deleted_at` as null.
 *    b. Insert a new record into `shopping_mall_review_snapshots` with: new UUID id, `shopping_mall_review_id` referencing the new review, `rating` and `body` matching the review, `created_at` set to current timestamp.
 * 5. Return the newly created review as `IShoppingMallReview`, including its snapshots array (containing the first snapshot), the associated customer display name, and any other joined fields needed for the response DTO.
 * @path /shoppingMall/customer/products/:productId/reviews
 * @accessor api.functional.shoppingMall.customer.products.reviews.create
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
          path: create.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * The unique identifier (UUID) of the product to review.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Review creation data including the qualifying order item, star rating, and optional text body.
     */
    body: IShoppingMallReview.ICreate;
  };
  export type Body = IShoppingMallReview.ICreate;
  export type Response = IShoppingMallReview;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/products/:productId/reviews",
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
    `/shoppingMall/customer/products/${encodeURIComponent(props.productId ?? "null")}/reviews`;
  export const random = (): IShoppingMallReview =>
    typia.random<IShoppingMallReview>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productId")(() => typia.assert(props.productId));
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
 * Update an existing purchase-verified review for a product.
 *
 * This operation allows an authenticated customer to edit the content of a review they previously submitted for a product they purchased. The review is identified by its unique UUID (`reviewId`) and must belong to the product specified by `productId`. The customer may update the star rating (integer 1–5), the optional text body, or both.
 *
 * Only the customer who originally authored the review is permitted to update it. Attempting to update another customer's review will result in an authorization error. Additionally, reviews that have already been marked as deleted (i.e., `deleted_at` is non-null in `shopping_mall_reviews`) cannot be updated and will return an error.
 *
 * Before applying the requested changes, the system appends an immutable snapshot record to `shopping_mall_review_snapshots`, capturing the review's current rating and body text at the moment of the edit. This preserves a complete chronological audit trail of all revisions for the review, which administrators can access for dispute resolution purposes (see `GET /products/{productId}/reviews/{reviewId}/snapshots`).
 *
 * After the review content is updated in `shopping_mall_reviews`, the product's average rating is immediately recalculated using only the non-deleted reviews for that product. This ensures that the updated star rating is reflected in the product's aggregate rating without delay. The sort position of the review on the product detail page is determined by the review's original `created_at` timestamp, not the `updated_at` timestamp; editing a review does not change its position in the listing.
 *
 * The updated review record, including the new rating, body, and updated timestamp, is returned in the response so clients can immediately reflect the changes in the UI without an additional fetch.
 *
 * @param props.connection
 * @param props.productId The UUID of the product that the review belongs to.
 * @param props.reviewId The UUID of the review to update.
 * @param props.body Updated rating and optional text content for the review.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Authenticate the requesting actor; must be a customer.
 * 2. Look up the review by `reviewId` in `shopping_mall_reviews`. Return 404 if not found.
 * 3. Verify `product_id` on the found review matches the `productId` path parameter. Return 404 if mismatch (review does not belong to this product).
 * 4. Verify `deleted_at` on the review is NULL. Return 422/409 if the review has been deleted.
 * 5. Verify `customer_id` on the review equals the authenticated customer's ID. Return 403 if mismatch (not the review's author).
 * 6. Begin a database transaction:
 *    a. INSERT a new record into `shopping_mall_review_snapshots` with: `shopping_mall_review_id` = reviewId, `rating` = current review.rating, `body` = current review.body, `created_at` = now(). This captures the state before the edit.
 *    b. UPDATE `shopping_mall_reviews` SET `rating` = request.rating, `body` = request.body (if provided), `updated_at` = now() WHERE `id` = reviewId.
 *    c. Recalculate the product's average rating: SELECT AVG(rating) FROM `shopping_mall_reviews` WHERE `product_id` = productId AND `deleted_at` IS NULL. (Store or cache as appropriate per platform conventions.)
 * 7. Commit the transaction.
 * 8. Return the updated `shopping_mall_reviews` record joined with the latest snapshot as `IShoppingMallReview`.
 *
 * Edge cases:
 * - If request.body is not provided (null/omitted), clear or leave the body field as null depending on the DTO contract.
 * - Rating must be an integer between 1 and 5 inclusive; reject with 422 if out of range.
 * - Ensure the recalculation excludes the current review if it was concurrently deleted (unlikely but guard with transaction isolation).
 * @path /shoppingMall/customer/products/:productId/reviews/:reviewId
 * @accessor api.functional.shoppingMall.customer.products.reviews.update
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
     * The UUID of the product that the review belongs to.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the review to update.
     */
    reviewId: string & tags.Format<"uuid">;

    /**
     * Updated rating and optional text content for the review.
     */
    body: IShoppingMallReview.IUpdate;
  };
  export type Body = IShoppingMallReview.IUpdate;
  export type Response = IShoppingMallReview;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/customer/products/:productId/reviews/:reviewId",
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
    `/shoppingMall/customer/products/${encodeURIComponent(props.productId ?? "null")}/reviews/${encodeURIComponent(props.reviewId ?? "null")}`;
  export const random = (): IShoppingMallReview =>
    typia.random<IShoppingMallReview>();
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
 * Delete a customer's own review for a specific product.
 *
 * This operation marks the target review as deleted by setting its `deleted_at` timestamp in the `shopping_mall_reviews` table. Once deleted, the review is immediately excluded from the product's publicly visible review list and from its average rating calculation. The platform recalculates the product's average rating based solely on remaining non-deleted reviews after this operation completes.
 *
 * Only the authenticated customer who originally authored the review is permitted to delete it. Attempting to delete a review authored by a different customer will result in an authorization error. The review must belong to the product specified in the path; if the review does not correspond to the given product, the request will be rejected.
 *
 * All review snapshots previously created for the deleted review — captured in the `shopping_mall_review_snapshots` table at each edit — are preserved in full and are never removed as a consequence of review deletion. These snapshots remain accessible to administrators for dispute resolution and audit purposes, even after the review itself is no longer visible to the public.
 *
 * Once deleted, the review cannot be restored by the customer. The customer may submit a new review for the same product only if they still meet the eligibility criteria: the order item must be in a delivered state and no active (non-deleted) review may already exist for that order item.
 *
 * This operation is accessible only to authenticated customers (member-level actors). Guests and unauthenticated users cannot delete reviews. Administrators may access the full history of deleted reviews, including their snapshots, through admin-scoped endpoints.
 *
 * @param props.connection
 * @param props.productId The UUID of the product that the review belongs to.
 * @param props.reviewId The UUID of the review to be deleted.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification 1. Authenticate the requesting customer. Reject with 401 if unauthenticated, or if the actor is not a customer.
 * 2. Look up the review record in shopping_mall_reviews by reviewId. If not found, return 404.
 * 3. Validate that the review's product_id matches the productId path parameter. If not, return 404 (do not leak cross-product information).
 * 4. Validate that the review's customer_id matches the authenticated customer's ID. If not, return 403 (authorization error).
 * 5. Check that the review has not already been deleted (deleted_at IS NULL). If already deleted, return 404 or 409 as appropriate.
 * 6. Set deleted_at = NOW() on the shopping_mall_reviews record in a database transaction.
 * 7. Recalculate the product's average rating: compute AVG(rating) over all shopping_mall_reviews where product_id = productId AND deleted_at IS NULL. Update or cache this value as needed by the platform's rating aggregation approach.
 * 8. Do NOT delete any shopping_mall_review_snapshots records associated with this review. Snapshots are preserved permanently.
 * 9. Return 204 No Content on success.
 * 10. Edge cases: if the review's product has been soft-deleted, the review can still be deleted by the customer. If the customer's account is in a restricted state, reject with 403.
 * @path /shoppingMall/customer/products/:productId/reviews/:reviewId
 * @accessor api.functional.shoppingMall.customer.products.reviews.erase
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
     * The UUID of the product that the review belongs to.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * The UUID of the review to be deleted.
     */
    reviewId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/customer/products/:productId/reviews/:reviewId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/products/${encodeURIComponent(props.productId ?? "null")}/reviews/${encodeURIComponent(props.reviewId ?? "null")}`;
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
      assert.param("productId")(() => typia.assert(props.productId));
      assert.param("reviewId")(() => typia.assert(props.reviewId));
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
