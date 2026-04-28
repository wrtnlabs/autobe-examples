import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallReview } from "../../../../structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "../../../../structures/IShoppingMallReview";

export * as snapshots from "./snapshots/index";

/**
 * Create a new product review written by the authenticated customer for a product that the customer actually purchased and received.
 *
 * This operation creates the current active review record in the shopping_mall_reviews table, which is the mutable review entity displayed on product detail pages and used as the source for average rating calculations over non-deleted reviews. The created review is tied to a concrete commerce context through the reviewed product, the parent order, and the exact delivered order item. This reflects the database design where a review stores shopping_mall_product_id, shopping_mall_order_id, and shopping_mall_order_item_id alongside the authoring customer and the customer-selected rating and optional written content.
 *
 * The endpoint is intended only for authenticated customers. The author identity must come from the signed-in customer session and must match the owner of the referenced order and order item. The service must reject attempts to create a review for another customer's purchase context. This behavior follows the business requirement that reviews are customer-authored product feedback linked to an eligible completed purchase, and the relational model that connects each review to shopping_mall_customers, shopping_mall_orders, and shopping_mall_order_items.
 *
 * Validation must ensure that the referenced order item belongs to the referenced order, that the referenced order belongs to the authenticated customer, that the order item corresponds to the referenced product, and that the order item's lifecycle status is eligible for review based on completed delivery context. The shopping_mall_order_items table explicitly stores item-level lifecycle state and delivered_at timing, and the review schema documents that shopping_mall_order_item_id establishes review eligibility and exact purchase context. Rating and optional content must be accepted as the customer feedback payload, and the service must enforce the allowed review score range through business validation before persisting the record.
 *
 * This operation must also enforce the one-review-per-product-per-order business rule reflected directly in the unique constraint on shopping_mall_reviews for shopping_mall_customer_id, shopping_mall_product_id, and shopping_mall_order_id. If a review already exists for the same customer, product, and order combination, the service must reject creation and direct the client to the review update flow instead of creating a duplicate current review. Historical review tracking is not provided by this create call itself; immutable review history is preserved later through shopping_mall_review_snapshots when edits or deletion events occur.
 *
 * After successful creation, the returned review becomes part of the product's displayed feedback collection and contributes to average rating calculations while it remains non-deleted. Related operations that may be used afterward include retrieving product detail data that shows newest-first reviews and later updating or removing the review through owner-only review management endpoints. If the customer account is deleted in the future, the preserved review remains available for product feedback visibility and the author identity is presented as deleted user according to the business requirements.
 *
 * @param props.connection
 * @param props.body Review creation input
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement a customer-authenticated service that
 *   inserts a new row into shopping_mall_reviews.
 *
 * 1. Resolve the authenticated customer ID from the session context. Never accept customer identity from the request body.
 * 2. Validate that the referenced shopping_mall_orders row exists, is not outside the caller's ownership, and belongs to the authenticated customer.
 * 3. Validate that the referenced shopping_mall_order_items row exists, belongs to the referenced order, and has not been administratively removed from usable business context.
 * 4. Validate that the referenced shopping_mall_products row exists and that the order item is actually for that product by tracing shopping_mall_order_items.shopping_mall_product_variant_id to a variant under the same product. If this relationship cannot be proven, reject the request.
 * 5. Validate review eligibility using order-item purchase context. Require the order item to be in a delivered state or otherwise satisfy the completed purchase rule defined by the business layer. Use shopping_mall_order_items.status and delivered_at as the core evidence for that check.
 * 6. Validate rating against the allowed review score range from business rules. Accept content as optional text; allow null or non-empty text according to DTO validation rules.
 * 7. Check for an existing review using the authenticated customer ID plus requested product ID and order ID. Enforce the unique business rule represented by @@unique([shopping_mall_customer_id, shopping_mall_product_id, shopping_mall_order_id]). If found, fail with a conflict-style business error instead of inserting.
 * 8. Insert the new shopping_mall_reviews row with a generated UUID, resolved shopping_mall_customer_id, requested shopping_mall_product_id, shopping_mall_order_id, shopping_mall_order_item_id, rating, content, current timestamps for created_at and updated_at, and deleted_at as null.
 * 9. Return the persisted review entity.
 *
 * Do not create shopping_mall_review_snapshots during initial creation, because snapshot rows are used to preserve edit or delete history, not initial authoring. Use a transaction if the implementation combines multiple validation reads with the insert and needs consistent enforcement. Map not-found, ownership violation, ineligible purchase context, and duplicate review cases to explicit service errors.
 * @path /shoppingMall/customer/reviews
 * @accessor api.functional.shoppingMall.customer.reviews.create
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
     * Review creation input
     */
    body: IShoppingMallReview.ICreate;
  };
  export type Body = IShoppingMallReview.ICreate;
  export type Response = IShoppingMallReview;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/reviews",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/reviews";
  export const random = (): IShoppingMallReview =>
    typia.random<IShoppingMallReview>();
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
 * Retrieve a filtered and paginated list of review records owned by the authenticated customer.
 *
 * This operation supports customer-facing review management by returning the current review collection that belongs only to the signed-in customer. It is intended for screens where a customer browses previously written product reviews, locates a review for a purchased item, and decides whether to inspect, update, or remove that review through related operations.
 *
 * The underlying data corresponds to the current review entity represented by `shopping_mall_reviews`, which stores customer-authored product reviews linked to purchase eligibility and preserved review history. The review domain requires a rating from 1 to 5 stars, allows text content to be omitted, and preserves historical changes separately through `shopping_mall_review_snapshots` when edits occur. When a review has been deleted from the current active set, preserved historical records remain available to relevant parties for audit or dispute needs.
 *
 * Access to this endpoint is strictly customer-scoped. The service must resolve the authenticated customer from the active session and return only reviews owned by that customer. The request payload must be treated only as search and pagination input, not as an authority source for ownership. Any attempt to use filtering criteria to reach another customer's review data must be rejected or safely constrained by the authenticated owner context.
 *
 * This operation should support common browsing behaviors such as filtering by related purchase context, rating, creation or update period, current availability state, and optional text-search criteria. Results must be paginated in accordance with the platform's list browsing rules so that only the requested page is returned and out-of-range page requests can be handled consistently with platform validation policy.
 *
 * This endpoint is commonly used before a single-review detail operation or before customer review update and deletion operations. It may also precede any dedicated history-view operation for preserved review snapshots when the customer needs to inspect how a review changed over time.
 *
 * @param props.connection
 * @param props.body Filtering, sorting, and pagination criteria for the authenticated customer's review list
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement this operation as a customer-scoped search
 *   over shopping_mall_reviews with mandatory authorization context from the
 *   authenticated customer session.
 *
 * 1. Resolve the signed-in customer identity and build the base query with WHERE shopping_mall_customer_id = auth.customer.id. Never trust a customer identifier from the request body for access control.
 * 2. Apply optional filters only when present in IShoppingMallReview.IRequest. Valid filter targets must map to actual schema fields: shopping_mall_product_id, shopping_mall_order_id, shopping_mall_order_item_id, rating, content, created_at, updated_at, and deleted_at. Treat deletion-state filters as conditions on whether deleted_at is null or not null. If range filtering is supported for rating or timestamps, map them directly to the integer and timestamptz columns.
 * 3. Support text search against content using partial matching semantics appropriate for the persistence layer. Because content is nullable, ensure null-safe filtering behavior.
 * 4. Support deterministic sorting. Default to created_at descending when the client does not provide a sort. Allow only a controlled set of sortable fields such as created_at, updated_at, and rating to avoid unstable or unsafe ordering.
 * 5. Return paginated results as IPageIShoppingMallReview.ISummary. The summary projection should include identifiers and review-management fields needed for list presentation, such as the review id, related product and order context identifiers, rating, abbreviated content or content presence, created_at, updated_at, and deletion-state information derived from deleted_at.
 * 6. Do not join or embed immutable review snapshot event rows from shopping_mall_review_snapshots in the primary list payload. If product display enrichment is needed for UX, it may read from shopping_mall_products by shopping_mall_product_id, but the operation should remain centered on the review entity and avoid unnecessary heavy joins.
 * 7. Exclude rows only by customer scope and explicit filters; do not silently discard deleted reviews unless the request asks for only active items. This preserves the customer's ability to browse both current active reviews and reviews removed from active rating contribution.
 * 8. Handle errors by returning authorization errors for unauthenticated access, not found or empty result semantics according to platform conventions for unmatched filters, and validation errors for malformed pagination, sort, or filter payloads. Because this is a read-only browsing operation, it must not modify shopping_mall_reviews or create rows in shopping_mall_review_snapshots.
 * @path /shoppingMall/customer/reviews
 * @accessor api.functional.shoppingMall.customer.reviews.index
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
     * Filtering, sorting, and pagination criteria for the authenticated customer's review list
     */
    body: IShoppingMallReview.IRequest;
  };
  export type Body = IShoppingMallReview.IRequest;
  export type Response = IPageIShoppingMallReview.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/reviews",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/reviews";
  export const random = (): IPageIShoppingMallReview.ISummary =>
    typia.random<IPageIShoppingMallReview.ISummary>();
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
 * Retrieve the detailed current-state record for a single product review by its unique identifier.
 *
 * This operation returns the mutable review entity stored in shopping_mall_reviews, which is the current customer-authored feedback record tied to a real purchase context. The review is linked to the authoring customer account, the reviewed product, the order used to establish one-review-per-product-per-order eligibility, and the specific order item that anchors the exact purchase line. The returned resource therefore represents more than free-form commentary: it is a post-purchase evaluation with a concrete commercial context, including the customer-selected star rating, optional written review text, and the lifecycle timestamps that describe when the review was created, last edited, and, if applicable, marked deleted.
 *
 * Access to this endpoint must be controlled carefully. Customers may retrieve their own review records to inspect the latest visible state and support later edit or deletion workflows. Administrators may retrieve a review record when overseeing disputes, moderation, or audit scenarios. The operation should not be treated as the public product-detail review feed because the public product page behavior is governed by review display rules that show active reviews in newest-first order and calculate average rating from non-deleted reviews only. A deleted review is preserved in the database for historical traceability, but it no longer functions as active visible feedback in the same way.
 *
 * The underlying database design separates the current review record from its preserved historical versions. shopping_mall_reviews stores the latest active state, while shopping_mall_review_snapshots records immutable snapshot events such as edits and deletion-related history. For that reason, this endpoint returns only the current review resource and not its snapshot timeline. Clients that need change history, dispute evidence, or audit visibility should use a separate history-oriented operation over review snapshots rather than assuming that this endpoint includes prior versions.
 *
 * When the referenced review does not exist, the service must reject the request. When the review exists but has been deleted, the service should apply authorization-sensitive handling: owners and administrators may still retrieve the preserved record for legitimate history or audit purposes, while callers attempting to use this endpoint as a public display mechanism must not receive deleted feedback as active product-page content. This behavior aligns the API with the business rule that only non-deleted reviews contribute to active display and product rating aggregation.
 *
 * @param props.connection
 * @param props.reviewId Unique identifier of the target review
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Load a single row from shopping_mall_reviews by its
 *   primary key id using the reviewId path parameter.
 *
 * Before returning the row, perform authorization checks. If the authenticated actor is a customer, allow access only when shopping_mall_customer_id matches the authenticated customer account. If the actor is an administrator or superAdministrator, allow access for oversight and dispute handling. Reject access for unrelated customers. Do not treat this endpoint as an anonymous or general storefront read path.
 *
 * Return the current review state mapped to IShoppingMallReview, including the persisted foreign-key context fields, rating, optional content, and created_at, updated_at, and deleted_at timestamps. Do not embed review snapshot history in this operation. If history is needed, it must be queried through shopping_mall_review_snapshots in a separate endpoint.
 *
 * If no review exists for the given id, return a not-found error. If the review has deleted_at set, keep the row preserved and return it only to authorized actors who are allowed to inspect preserved review records. Ensure downstream callers do not use deleted records as active product-detail display content or rating-calculation input. No database mutation or transaction is required because this is a read-only retrieval.
 * @path /shoppingMall/customer/reviews/:reviewId
 * @accessor api.functional.shoppingMall.customer.reviews.at
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
     * Unique identifier of the target review
     */
    reviewId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallReview;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/customer/reviews/:reviewId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/reviews/${encodeURIComponent(props.reviewId ?? "null")}`;
  export const random = (): IShoppingMallReview =>
    typia.random<IShoppingMallReview>();
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

/**
 * Update the current visible state of an existing product review authored by the authenticated customer.
 *
 * This operation modifies the mutable live review record stored in the shopping_mall_reviews table, which represents the current customer-authored feedback shown on product detail pages and used as the source for average rating calculations over non-deleted reviews. The live review contains the customer-selected star rating and optional written content, while its customer, product, order, and order-item references preserve the exact purchase context that justified review eligibility at creation time. Because the review is the active feedback object, a successful update replaces the previously visible review content and rating with the new values supplied by the customer.
 *
 * This operation is restricted to the customer who owns the target review. The platform requirements state that customers can edit only their own reviews, and an attempt to modify another customer's review must be rejected. The implementation must also ensure that the targeted review still exists as an editable live record and has not already been deleted from the active feedback set. If the review cannot be found, does not belong to the authenticated customer, or is no longer editable, the operation must fail without mutating the stored review.
 *
 * The operation is tightly related to the immutable history model stored in shopping_mall_review_snapshots. Every review edit must create a snapshot event before the live review is overwritten so the platform retains trustworthy evidence of how the customer feedback changed over time. The snapshot record belongs to exactly one review and stores snapshot metadata such as the change category and optional reason, while the business requirement establishes that the earlier review state must remain preserved as historical evidence even though the product detail page shows only the most recent review version.
 *
 * This endpoint affects only the current visible review state and its audit trail. It does not change the review's purchase ownership, customer ownership, product linkage, order linkage, or order-item linkage. It also does not directly expose snapshot management to clients, because review snapshots are preserved historical records rather than customer-managed resources. Related operations include the review creation endpoint that establishes the original eligible review and the review deletion endpoint that removes a review from active rating contribution while preserving history.
 *
 * On success, the response returns the updated live review resource so the client can immediately refresh the product detail page or the customer's review management view. Error handling must preserve historical integrity: failed authorization, validation failure, or missing-resource cases must not alter the live review and must not create misleading history entries.
 *
 * @param props.connection
 * @param props.reviewId Target review ID
 * @param props.body Updated review rating and content
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement this operation in the customer review
 *   service as an ownership-scoped update of shopping_mall_reviews.
 *
 * 1. Authenticate the caller as a customer and load the target shopping_mall_reviews row by id = reviewId.
 * 2. If no review exists, return a not-found error.
 * 3. If the loaded review.shopping_mall_customer_id does not match the authenticated customer id, return a forbidden error.
 * 4. If review.deleted_at is not null, reject the update because deleted reviews are no longer treated as active reviews.
 * 5. Validate the request body against review business rules, including allowed rating range and any text constraints defined by the DTO/schema layer.
 * 6. Before changing the live review, create one append-only shopping_mall_review_snapshots row linked by shopping_mall_review_id = review.id. Set change_type to an edit category and optionally persist a change_reason when the service layer provides one. The snapshot creation is mandatory for every successful edit.
 * 7. Update only mutable live fields on shopping_mall_reviews: rating, content, and updated_at. Do not modify shopping_mall_customer_id, shopping_mall_product_id, shopping_mall_order_id, shopping_mall_order_item_id, created_at, or deleted_at through this endpoint.
 * 8. Execute snapshot creation and review update in a single transaction so history and current state remain consistent.
 * 9. Return the refreshed review entity after the update.
 *
 * Additional implementation notes:
 * - Preserve nullable content semantics: the review may contain rating only, so content may remain null after update if allowed by the request DTO.
 * - Do not recalculate product average rating by including deleted reviews. If downstream aggregation is maintained synchronously or asynchronously, ensure only non-deleted reviews are considered.
 * - Do not create a snapshot when validation or authorization fails, because no actual edit occurred.
 * - Audit logging may record the authenticated customer and target review id, but client-visible behavior should remain focused on the updated live review resource.
 * @path /shoppingMall/customer/reviews/:reviewId
 * @accessor api.functional.shoppingMall.customer.reviews.update
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
     * Target review ID
     */
    reviewId: string & tags.Format<"uuid">;

    /**
     * Updated review rating and content
     */
    body: IShoppingMallReview.IUpdate;
  };
  export type Body = IShoppingMallReview.IUpdate;
  export type Response = IShoppingMallReview;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/customer/reviews/:reviewId",
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
    `/shoppingMall/customer/reviews/${encodeURIComponent(props.reviewId ?? "null")}`;
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
 * Permanently removes the specified customer-owned review from the active product feedback set so that it no longer appears as an active review on the product detail page and no longer contributes to the product's average rating.
 *
 * This operation applies to the current review record stored in the review domain, which represents current customer-authored product feedback for a purchased product. The business requirements state that customers can delete only their own reviews, that deleted reviews must be excluded from average rating calculations, and that active product review displays are ordered newest first. As a result, deleting a review changes both the visibility of the current review in customer-facing product feedback and the aggregate rating derived from non-deleted reviews.
 *
 * The endpoint must be executed only by the signed-in customer who owns the target review. If a customer attempts to delete a review written by another customer, the request must be rejected. This ownership rule is critical because review deletion is a self-service content management action, not a general moderation action described for administrators in the loaded materials.
 *
 * Deletion of the current review does not remove preserved review history. Earlier review states already captured in immutable review snapshot records remain preserved for accountability and historical traceability. This separation between the current review object and preserved historical records is important because the domain model distinguishes deleted current feedback from its historical versions.
 *
 * This operation is different from customer account deletion. When a customer account is deleted, existing reviews are preserved for continued product display and the author label is replaced with "deleted user". By contrast, deleting an individual review through this endpoint removes that review from active review display and from rating aggregation, while still preserving pre-existing historical snapshots.
 *
 * Clients will typically call product review listing or product detail retrieval operations after this endpoint to refresh the visible review list and recalculated average rating for the related product.
 *
 * @param props.connection
 * @param props.reviewId Identifier of the customer-owned review to remove from the active review set.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement review deletion as an ownership-validated
 *   state change on the shopping_mall_reviews primary entity identified by
 *   reviewId.
 *
 * 1. Authenticate the caller as a customer session.
 * 2. Load the target review by its primary identifier.
 * 3. Verify that the review exists and belongs to the authenticated customer account. If the review does not exist, return a not-found error. If it belongs to another customer, return a forbidden error.
 * 4. Apply deletion to the current review record using the schema's actual deletion mechanism so the review is no longer treated as an active review. Do not remove preserved review snapshot records from shopping_mall_review_snapshots.
 * 5. Recompute the related product's average rating from only non-deleted reviews for that product. Deleted reviews must be excluded from both the rating total and the rating count. If no non-deleted reviews remain, do not derive the average from deleted reviews.
 * 6. Persist the review deletion and any related aggregate updates in a transaction so the review's active visibility state and the product rating remain consistent.
 * 7. Return success with no response body.
 *
 * Implementation notes:
 * - Preserve all existing review history that was created before deletion.
 * - Ensure the deleted review is removed from active product-detail review display behavior.
 * - Do not treat this operation as customer account deletion; do not relabel the author as "deleted user" here unless that behavior is separately driven by account deletion logic.
 * - Downstream read operations that display product reviews should naturally exclude this deleted review from active displays and from aggregate rating calculations.
 * @path /shoppingMall/customer/reviews/:reviewId
 * @accessor api.functional.shoppingMall.customer.reviews.erase
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
     * Identifier of the customer-owned review to remove from the active review set.
     */
    reviewId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/customer/reviews/:reviewId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/customer/reviews/${encodeURIComponent(props.reviewId ?? "null")}`;
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
