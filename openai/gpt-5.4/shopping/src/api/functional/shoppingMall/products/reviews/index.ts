import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallReview } from "../../../../structures/IPageIShoppingMallReview";
import { IShoppingMallReview } from "../../../../structures/IShoppingMallReview";

/**
 * Retrieve a filtered and paginated list of current reviews for a specific product.
 *
 * This operation returns the visible feedback collection attached to the target product. In the shopping mall domain, a review is customer-authored product evaluation linked to an actual purchase context rather than general commentary, and the current review object represents the product-facing feedback layer shown to users while it remains active. The endpoint is therefore intended for product detail experiences, marketplace browsing, and moderation-oriented inspection of the current review set for one product.
 *
 * The operation is scoped by the `productId` path parameter because reviews belong to a product and contribute to that product’s reputation. The response should contain current review summaries only, not immutable review history records. This distinction is important because review history is preserved separately in ReviewSnapshot records, while the Review entity represents the current state that can be active or deleted from the customer-visible feedback set. Only reviews that remain active contribute to the product’s average rating, so implementations should ensure that filtering and sorting behavior reflects the current review state rather than historical revisions.
 *
 * This endpoint supports list browsing expectations through request-body driven pagination, filtering, and sorting. Clients can use it to load the initial product review list, refine the results by criteria such as rating or visibility-related status exposed by the request DTO, and request subsequent pages for large review collections. Because this is a nested product operation, clients should first know the target product identifier from a product listing or product detail retrieval operation, then call this endpoint to browse the associated reviews.
 *
 * Read access is appropriate for marketplace viewing and platform oversight. Customers use the operation to inspect product feedback before purchase, sellers may use it to review feedback associated with their merchandise, and administrators or super administrators may use it for oversight and dispute-related review of marketplace content. The operation is read-only and must not mutate reviews, customer accounts, or preserved review history. If the target product does not exist, is not accessible under platform visibility rules, or the request body contains invalid paging or filter criteria, the operation must fail without altering any preserved records.
 *
 * @param props.connection
 * @param props.productId Target product identifier
 * @param props.body Review list filters, sorting, and pagination criteria
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Validate that the `productId` path parameter is a well-formed UUID and load the target product record before querying reviews. If the product does not exist, return a not-found error. After confirming the product context, query current review records scoped to that product only; do not read from review snapshot history for this operation.
 *
 * Interpret the request body `IShoppingMallReview.IRequest` as the source of pagination, filtering, and sorting instructions. Apply product scoping from the path parameter first, then apply any request filters such as rating, current visibility-related state, creation-time ranges, or search criteria that are actually defined by the DTO. Do not duplicate `productId` in the request DTO because the path already supplies the product context.
 *
 * When building the result set, return paginated review summaries using `IPageIShoppingMallReview.ISummary`. The implementation should prefer stable ordering so repeated paging requests remain deterministic. If sorting options are supplied, validate them against supported columns. If no explicit sort is provided, default to a sensible review-browsing order such as newest-first, provided that order is supported by the DTO and persistence layer.
 *
 * Treat only current Review records as searchable output. Reviews that are no longer active in the visible feedback set must be handled according to business rules and the requested filters, but immutable ReviewSnapshot records are outside the scope of this endpoint. The implementation must not mutate review state, recalculate product aggregates as a side effect, or expose sensitive customer account internals. Any author display handling, including deleted-account presentation rules, should be reflected through the response DTO mapping layer rather than through direct exposure of private account data.
 *
 * Return validation errors for malformed pagination or unsupported filters, forbidden errors when the caller lacks permission under platform access rules, and not-found errors when the product context is invalid. This operation should be implemented as a read-only query path with no transaction beyond the consistency guarantees required for paginated reads.
 * @path /shoppingMall/products/:productId/reviews
 * @accessor api.functional.shoppingMall.products.reviews.index
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
     * Target product identifier
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Review list filters, sorting, and pagination criteria
     */
    body: IShoppingMallReview.IRequest;
  };
  export type Body = IShoppingMallReview.IRequest;
  export type Response = IPageIShoppingMallReview.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/products/:productId/reviews",
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
    `/shoppingMall/products/${encodeURIComponent(props.productId ?? "null")}/reviews`;
  export const random = (): IPageIShoppingMallReview.ISummary =>
    typia.random<IPageIShoppingMallReview.ISummary>();
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
 * Retrieve a single active review for a specific product.
 *
 * This operation returns the current customer-authored review record stored in the shopping_mall_reviews table for the product identified by productId and the review identified by reviewId. The review represents post-purchase product feedback tied to a concrete purchase context through shopping_mall_order_id and shopping_mall_order_item_id, and it contains the current rating, optional written content, and lifecycle timestamps such as created_at and updated_at. The operation is intended for product-review detail access where the caller needs one specific review rather than the newest-first collection shown on the product detail page.
 *
 * The endpoint is product-scoped by design. Even though shopping_mall_reviews has its own primary key id, the path requires both productId and reviewId so the system can verify that the requested review actually belongs to the specified shopping_mall_products record. This prevents cross-product lookup mistakes and keeps the interface aligned with the domain relationship in which a product has many reviews. Because shopping_mall_reviews uses deleted_at to mark customer-deleted reviews while preserving history, the operation should treat deleted review records as unavailable for normal active-review retrieval.
 *
 * From a business perspective, reviews are visible customer product feedback and contribute to product reputation only while they remain non-deleted. The product detail page requirement states that displayed reviews show the submitted rating and any provided review text content, and that only non-deleted reviews contribute to the product’s average rating. If the original customer account has been deleted, preserved review visibility still remains important and the author must be represented as deleted user at the DTO or presentation layer rather than by exposing removed profile identity.
 *
 * This operation may be used together with the product review list operation that presents reviews in newest-first order on a product detail page. Clients would typically load the product detail context first and then use this endpoint when a specific review must be opened, refreshed after an edit, or inspected for moderation or dispute review. Authorization and response shaping must respect the distinction between preserved historical review continuity and the active review set that remains visible to users.
 *
 * @param props.connection
 * @param props.productId Target product's ID
 * @param props.reviewId Target review's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement a read-only service method that selects one row from shopping_mall_reviews by id = :reviewId and shopping_mall_product_id = :productId.
 *
 * Validate both path parameters as UUID values before querying. Execute a single-record lookup constrained by both identifiers so a review cannot be fetched through an unrelated product path. If no matching row exists, return a not-found error. If a matching row exists but deleted_at is not null, treat the review as not available for normal active retrieval and return a not-found error rather than exposing it as an active product review.
 *
 * Join or separately load the minimum related data needed for the response projection from shopping_mall_customers and shopping_mall_products only if the DTO requires author or product summary fields. When customer identity must be represented and the linked shopping_mall_customers.deleted_at is not null, map the author display to a deleted-user representation instead of exposing removed customer-facing identity data. Do not mutate rating aggregates in this operation.
 *
 * Ensure the response reflects the current review state only, not snapshot history. Review snapshots are preserved in a separate history model and are outside the scope of this endpoint. Return the latest rating, optional content, created_at, and updated_at from shopping_mall_reviews. Preserve ownership and authorization checks in middleware or service policy so public product-review visibility is supported while still allowing administrative and seller oversight use cases where permitted by the platform security model.
 * @path /shoppingMall/products/:productId/reviews/:reviewId
 * @accessor api.functional.shoppingMall.products.reviews.at
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
     * Target product's ID
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Target review's ID
     */
    reviewId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallReview;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/products/:productId/reviews/:reviewId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/products/${encodeURIComponent(props.productId ?? "null")}/reviews/${encodeURIComponent(props.reviewId ?? "null")}`;
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
