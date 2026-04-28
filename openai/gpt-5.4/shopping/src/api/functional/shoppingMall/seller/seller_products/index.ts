import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IShoppingMallProduct } from "../../../../structures/IShoppingMallProduct";

export * as images from "./images/index";
export * as variants from "./variants/index";

/**
 * Create a new seller-owned product listing in the marketplace catalog.
 *
 * This operation allows an authenticated seller to register a new current product record that represents a sellable catalog item offered through the platform. In business terms, the product is the overall merchandise offering customers encounter when browsing listings, reading product details, and preparing for purchase. The created record stores the seller-controlled merchandise identity described by the current product name, current seller-provided product description, current base merchandise price, and current lifecycle and listing state. The product may also be assigned to a current category so that it appears within the storefront classification structure used for browsing and discovery.
 *
 * Access to this operation is restricted to the seller actor because seller identity is the basis for seller-only catalog management permissions. The product is seller-owned in business terms, and ownership boundaries are enforced so that the created product belongs to the authenticated seller's own commercial presence on the platform. Customers do not create products, and administrators provide oversight rather than acting as the seller's catalog operator. The seller account's operational standing must also be checked before creation because the seller table stores approval standing and restriction flags that affect selling authority, including approval_status, suspended, and banned.
 *
 * The operation creates the current state in shopping_mall_products, which is the parent record for downstream product images, variants, and product snapshots. The created record references shopping_mall_sellers through shopping_mall_seller_id and may reference shopping_mall_categories through shopping_mall_category_id when the seller assigns the product to an active category. The category relationship is optional at the schema level, which means the product may be created without a category if the business flow permits an uncategorized listing. When a category is supplied, the system must validate that the referenced category exists and is still active for storefront browsing rather than deleted.
 *
 * The request body should contain only product creation fields and must not attempt to submit ownership data that overrides the authenticated seller context. Seller ownership is derived from the current session, not from arbitrary client input. Product snapshots are not created by this operation because snapshot preservation is specifically required when an existing product is edited and the prior state must be captured before applying changes. After successful creation, clients can use related operations for subsequent product image management, variant management, and later product updates within the seller's own catalog boundary.
 *
 * If validation fails, the system should reject the request without creating a partial product record. Typical failures include an unauthenticated or ineligible seller, an invalid or deleted category reference, malformed product data, or an attempt to create a product while the seller is suspended or banned from using seller functions. On success, the response returns the newly created current product resource so the client can immediately continue with dependent catalog-management operations such as adding images or configuring variants.
 *
 * @param props.connection
 * @param props.body Product creation information for the authenticated seller
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement this operation as seller-scoped creation of
 *   a current product record in shopping_mall_products.
 *
 * Authenticate the caller as a seller and derive the owner from the authenticated session instead of client input. Load the seller record from shopping_mall_sellers by authenticated seller id and verify the account is eligible to create products. Reject the request when the seller does not exist, is soft deleted, is banned, is suspended from creating or editing products, or is not in an approved selling state according to approval_status.
 *
 * Validate the request body fields against the actual product schema. Accept only the fields needed to populate shopping_mall_products: shopping_mall_category_id when category assignment is provided, name, description, base_price, and status if creation rules allow the client to set an initial lifecycle state. Do not accept shopping_mall_seller_id from the client. If shopping_mall_category_id is present, query shopping_mall_categories and ensure the category exists and deleted_at is null before linking it. If the category does not exist or is inactive, reject the request.
 *
 * Insert a new shopping_mall_products row with a generated UUID id, the authenticated seller id as shopping_mall_seller_id, the validated optional category id, the provided name, description, base_price, and initial status, plus created_at and updated_at timestamps set to the current time. Set deleted_at to null. Use a single transaction for the create flow so no partial side effects remain if validation or persistence fails.
 *
 * Do not create product snapshots during initial creation. Snapshot logic applies when editing an existing owned product, where the prior state must be preserved before the update is applied. Also do not create variants, images, or inventory records automatically unless another requirement explicitly demands it; those belong to separate follow-up operations.
 *
 * After insert, load and return the created current product record. The returned DTO should reflect the persisted product state, including its seller ownership link and optional category assignment. Ensure server-side authorization and validation errors are mapped to clear failures, and never allow one seller to create a product under another seller's ownership.
 * @path /shoppingMall/seller/seller-products
 * @accessor api.functional.shoppingMall.seller.seller_products.create
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
     * Product creation information for the authenticated seller
     */
    body: IShoppingMallProduct.ICreate;
  };
  export type Body = IShoppingMallProduct.ICreate;
  export type Response = IShoppingMallProduct;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/seller-products",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/seller-products";
  export const random = (): IShoppingMallProduct =>
    typia.random<IShoppingMallProduct>();
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
 * Update the current state of a seller-owned product listing.
 *
 * This operation allows an authenticated seller to replace the editable current fields of a product that belongs to that seller. In the underlying shopping_mall_products record, the product is the seller-controlled merchandise identity used for catalog browsing and purchase preparation, and it stores the current assigned category, current product name, current seller-provided product description, current base merchandise price, and current lifecycle status that determines listing visibility and operational availability. The operation returns the refreshed current product after the update is committed so the seller can immediately continue product management with the latest persisted state.
 *
 * Access to this operation is limited to the owning seller. The shopping mall treats each product as seller-owned in business terms, and the product belongs to that seller's catalog presence on the platform. If a seller attempts to update a product owned by another seller, the request must be rejected. This ownership check is mandatory before any mutation is applied. The seller identity is not changed by this operation, because the owner seller account reference is the commercial source of the merchandise offering and is not an editable attribute of ordinary product maintenance.
 *
 * This operation is tightly coupled to historical preservation. The shopping_mall_product_snapshots table stores immutable snapshot event records for products and provides the temporal anchor for preserved prior states. When a seller edits one of their own products, the platform must create a product snapshot of the product state that existed immediately before the edit is applied. Snapshot creation is part of the same business operation as the update itself. If the prior state cannot be preserved, the update must be treated as invalid and must not be committed. Existing snapshots remain preserved for later review even if the current product is later removed from active listings.
 *
 * Category handling must respect the catalog model. A product may reference a shopping_mall_categories record through shopping_mall_category_id, and categories are used for storefront browsing and administrative catalog management. Because categories support deletion from active browsing through their deleted_at marker, implementations should reject reassignment to a category that does not exist or is no longer active. If business logic allows the product to become uncategorized, the category reference may be set to null rather than pointing to an inactive category.
 *
 * This endpoint should typically be used after the seller has already obtained the target product from a detail or list operation in the seller product management flow. After a successful update, related seller product detail retrieval can be used to confirm the visible catalog state, while historical review flows can inspect preserved product snapshots when audit or dispute resolution is needed. Error responses should cover missing products, non-owned products, invalid category references, invalid field values, and failure to preserve the required prior-state snapshot.
 *
 * @param props.connection
 * @param props.productId Target product identifier.
 * @param props.body Editable fields for the target product.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification Implement this operation as a transactional seller
 *   product update on shopping_mall_products.
 *
 * 1. Authenticate the caller as a seller account.
 * 2. Load the target shopping_mall_products row by id = productId and deleted_at IS NULL or, if deleted products remain addressable in seller management, by id alone with subsequent status validation according to service policy.
 * 3. If no product exists, fail with a not-found error.
 * 4. Verify that product.shopping_mall_seller_id matches the authenticated seller's id. If it does not match, reject the request as forbidden and do not create any snapshot.
 * 5. Validate the incoming update payload against the editable fields only. Allow updates only to shopping_mall_category_id, name, description, base_price, and status according to the generated IShoppingMallProduct.IUpdate schema. Do not accept ownership changes or direct writes to created_at, updated_at, deleted_at, or id.
 * 6. If shopping_mall_category_id is provided and not null, load shopping_mall_categories by that id and confirm the category exists and deleted_at IS NULL. If the category is missing or inactive, reject the request. If null is provided, allow the product to become uncategorized.
 * 7. Before applying any modification, create a shopping_mall_product_snapshots row referencing the target product id and the current timestamp. Then create any required child snapshot records for the pre-update product state, including image and variant snapshot copies through the snapshot subsystem if that subsystem exists in the implementation layer. The pre-update state must reflect the exact current state before mutation.
 * 8. If snapshot creation fails at any point, roll back the transaction and return an error indicating the product update could not be completed.
 * 9. Apply the update to shopping_mall_products, setting the provided editable fields and updating updated_at to the current timestamp.
 * 10. Commit the transaction only after both snapshot preservation and product update succeed.
 * 11. Return the refreshed product row mapped to IShoppingMallProduct.
 *
 * Validation and business rules:
 * - Enforce owner-only editing for sellers.
 * - base_price must remain a valid non-negative merchandise price according to DTO validation rules.
 * - name and description must satisfy DTO length/content rules and should be persisted as the current listing values shown in catalog and detail pages.
 * - status must be limited to the allowed product lifecycle states supported by the service.
 * - Never remove or modify existing historical snapshot records during this operation.
 *
 * Implementation notes:
 * - Use a single database transaction spanning ownership verification, snapshot creation, and the update.
 * - Prefer row-level locking on the target product during the transaction to prevent concurrent edits from losing a prior state snapshot.
 * - Log authorization failures and snapshot failures for audit and operational diagnosis.
 * - Keep response mapping focused on the current product record; historical snapshot retrieval belongs to separate read operations.
 * @path /shoppingMall/seller/seller-products/:productId
 * @accessor api.functional.shoppingMall.seller.seller_products.update
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
     * Target product identifier.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Editable fields for the target product.
     */
    body: IShoppingMallProduct.IUpdate;
  };
  export type Body = IShoppingMallProduct.IUpdate;
  export type Response = IShoppingMallProduct;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/seller-products/:productId",
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
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}`;
  export const random = (): IShoppingMallProduct =>
    typia.random<IShoppingMallProduct>();
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
 * Permanently remove a seller-owned product from active marketplace listings when no blocking commerce or after-sales conditions remain.
 *
 * This operation allows an authenticated seller to delete one of the seller's own product listings represented by `shopping_mall_products`, the current sellable catalog record that stores the seller-controlled merchandise identity, category assignment, base price, and lifecycle status used for listing visibility and purchase availability. The request targets a single product by `productId`, which maps to `shopping_mall_products.id`. The operation is seller-scoped and must only succeed when the requesting seller is the owner recorded in `shopping_mall_products.shopping_mall_seller_id`.
 *
 * Deletion is not unconditional. The platform must first evaluate all active `shopping_mall_product_variants` belonging to the product because variants are the canonical purchasable SKU-level records referenced by carts, orders, inventory history, and snapshot records. If any related `shopping_mall_order_items` row is in `paid` status, the product cannot be deleted because there is still a purchased item awaiting seller fulfillment. If any related order item is in `shipped` status, the product also cannot be deleted because fulfillment is already in progress and historical continuity must remain intact while the shipment lifecycle is unfinished.
 *
 * The platform must also verify after-sales workflows linked through those order items. A product deletion request must be rejected when any related `shopping_mall_cancellation_requests` record remains in `pending` status or any related `shopping_mall_refund_requests` record remains in `pending` status. These tables store the active mutable state of customer-submitted cancellation and refund workflows, including the customer reason, current status, and review metadata. Blocking deletion in these cases preserves seller and customer dispute handling, prevents operational inconsistency, and complies with the business rule that products with unresolved post-purchase issues cannot be removed.
 *
 * When deletion is allowed, the result must remove the product from active search results and category listings as required by the product deletion requirements. The effect also extends to the product's active variants and inventory records so that the deleted product is no longer available for active marketplace use. At the same time, the implementation must preserve historical order records and related snapshots that document what was purchased at the time of sale. This is consistent with the schema comments for `shopping_mall_order_items`, which preserve transactional facts separately from purchase-time snapshot tables, and with the product model's own lifecycle-oriented design using status and preserved references.
 *
 * This endpoint does not replace product editing or variant management APIs. Sellers should use the relevant update and maintenance endpoints before deletion when they intend to modify a listing rather than remove it. Once this deletion succeeds, the product should no longer appear in browsing experiences, and subsequent seller maintenance of that product should be treated as unavailable through active listing workflows. Error responses should be produced when the product does not exist, is not owned by the authenticated seller, or is blocked by paid items, shipped items, pending cancellation requests, or pending refund requests.
 *
 * @param props.connection
 * @param props.productId Target product's unique identifier
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the caller as a seller account. 2.
 *   Load the target `shopping_mall_products` row by `id = productId` and ensure
 *   it is not already removed from active use. 3. Verify ownership by comparing
 *   `shopping_mall_products.shopping_mall_seller_id` with the authenticated
 *   seller's identifier. If they differ, reject the request. 4. Load all
 *   `shopping_mall_product_variants` rows for the product, using
 *   `shopping_mall_product_variants.shopping_mall_product_id = productId`, and
 *   exclude already inactive variants only if the implementation distinguishes
 *   active versus removed children through `deleted_at` or status. 5. For every
 *   related variant, check `shopping_mall_order_items` for rows with
 *   `shopping_mall_product_variant_id` matching the variant and `status` in
 *   (`paid`, `shipped`). If any such row exists, reject deletion. 6. For every
 *   related variant, inspect related after-sales workflows through
 *   `shopping_mall_order_items.id`: - join to
 *   `shopping_mall_cancellation_requests` on `shopping_mall_order_item_id` and
 *   reject if any active request has `status = pending`; - join to
 *   `shopping_mall_refund_requests` on `shopping_mall_order_item_id` and reject
 *   if any active request has `status = pending`. 7. If no blocking condition
 *   exists, perform the deletion in a single transaction. Downstream
 *   implementation may either physically remove active rows or mark them out of
 *   active use using lifecycle fields already present in schema (`status`,
 *   `deleted_at`) so long as the externally observable result is that the
 *   product is deleted from active listings. 8. Within the same transaction,
 *   remove the product and its variants from active marketplace use. Ensure
 *   inventory records tied to the product's variants are also removed from
 *   active use if the implementation uses logical deletion for operational
 *   tables. Do not alter preserved order-item history or purchase-time
 *   snapshots. 9. Commit the transaction and return success with no response
 *   body. 10. Error handling: - product not found or already unavailable:
 *   return not-found style failure; - caller is not the owner seller: return
 *   forbidden style failure; - any `paid` or `shipped` order item exists:
 *   return conflict/business-rule failure; - any pending cancellation or refund
 *   request exists: return conflict/business-rule failure. 11. Keep the
 *   operation idempotent from an API-consumer perspective where practical:
 *   repeated deletion of a non-existent or already unavailable product should
 *   not reactivate or mutate preserved history.
 * @path /shoppingMall/seller/seller-products/:productId
 * @accessor api.functional.shoppingMall.seller.seller_products.erase
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
     * Target product's unique identifier
     */
    productId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/seller/seller-products/:productId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/seller-products/${encodeURIComponent(props.productId ?? "null")}`;
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
