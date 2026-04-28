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
export * as snapshots from "./snapshots/index";

/**
 * Create a new product listing owned by the authenticated seller.
 *
 * This operation registers a new product in the `shopping_mall_products` table under the currently authenticated seller's account. The seller affiliation (`shopping_mall_seller_id`) is established at creation time from the session and is immutable — it can never be changed after the product is created. Only sellers with an approved status may invoke this endpoint.
 *
 * Four fields are required to create a product: a human-readable `name` displayed in search results and category pages, a detailed `description` of the product's characteristics and intended use, a `base_price` expressed as a floating-point number in the platform's base currency unit, and a `categoryId` referencing an existing category in `shopping_mall_categories`. If the referenced category does not exist, the request is rejected. Attempting to create a product without any of these required fields results in an error indicating which fields are missing.
 *
 * In addition to core product fields, the creation payload may optionally include an initial set of product images and product variants. If images are provided, they are stored in `shopping_mall_product_images` with ordered sequence values reflecting the provided order — the first image automatically becomes the primary image. If variants are provided, each variant must supply a globally unique SKU code (stored in `shopping_mall_product_variants.sku`) and an optional price override; each variant may also include a list of option key-value pairs stored in `shopping_mall_product_variant_options`. If any variant's SKU code collides with an existing variant on the platform, the entire request is rejected.
 *
 * Upon successful creation, the system automatically generates a `shopping_mall_product_snapshots` record capturing the product's initial complete state, including all images and variant configurations. This snapshot serves as the immutable historical baseline for future orders and audits.
 *
 * The newly created product is immediately visible in seller-facing management views. Its visibility to customers depends on the seller's approval status and the product's associated category. Related operations: use `PUT /products/{productId}` to update product fields, `POST /products/{productId}/images` to append additional images, `POST /products/{productId}/variants` to add new variants, and `DELETE /products/{productId}` to remove the product.
 *
 * @param props.connection
 * @param props.body Creation information for the new product, including required core fields and optional images and variants.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the request as a seller actor.
 *   Retrieve the seller's ID from the session token. Verify the seller has
 *   'approved' status; reject with 403 if not. 2. Validate the request body: -
 *   `name`: required, non-empty string. - `description`: required, non-empty
 *   string. - `base_price`: required, positive number. - `categoryId`: required
 *   UUID; verify it exists in `shopping_mall_categories`. Return 404/422 if not
 *   found. - `images` (optional): array of URL strings; if provided, assign
 *   sequential `sequence` values starting from 0. - `variants` (optional):
 *   array of variant objects each with `sku` (required, globally unique in
 *   `shopping_mall_product_variants`), optional `price_override`, and optional
 *   `options` (array of {key, value} pairs). Validate SKU uniqueness across the
 *   entire platform before inserting. 3. Execute inside a single database
 *   transaction: a. Insert a row into `shopping_mall_products` with the
 *   seller's ID, validated category ID, name, description, base_price, and
 *   current timestamps for `created_at` and `updated_at`. `deleted_at` is null.
 *   b. If images were provided, insert rows into `shopping_mall_product_images`
 *   with the product ID, each URL, and incrementing `sequence` values. c. If
 *   variants were provided, insert rows into `shopping_mall_product_variants`
 *   for each. For each variant, insert its option key-value pairs into
 *   `shopping_mall_product_variant_options` with ordered `sequence` values. d.
 *   After all inserts succeed, automatically create a
 *   `shopping_mall_product_snapshots` record that captures the complete product
 *   state at creation time (all fields, all images, all variants/options). 4.
 *   On SKU collision, rollback and return 422 with a descriptive error. 5. On
 *   category not found, return 404/422 before starting the transaction. 6.
 *   Return the fully constructed product entity including nested images and
 *   variants.
 * @path /shoppingMall/seller/products
 * @accessor api.functional.shoppingMall.seller.products.create
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
     * Creation information for the new product, including required core fields and optional images and variants.
     */
    body: IShoppingMallProduct.ICreate;
  };
  export type Body = IShoppingMallProduct.ICreate;
  export type Response = IShoppingMallProduct;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/seller/products",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/products";
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
 * Update the core attributes of a product owned by the authenticated seller.
 *
 * This operation allows an approved seller to modify the editable fields of one of their own product listings stored in the `shopping_mall_products` table. The fields that can be updated include the product's `name` (the human-readable title displayed in search results and category pages), `description` (a detailed narrative of the product's characteristics), `base_price` (the default reference price used when no variant-specific pricing applies), and `shopping_mall_category_id` (the category assignment within the two-tier catalog hierarchy, which may be set to null to uncategorize the product or reassigned to any valid top-level or sub-category).
 *
 * Product ownership is strictly enforced. The system verifies that the product identified by `productId` belongs to the seller making the request before processing the update. If the product belongs to a different seller, the request is rejected. Suspended sellers are also prevented from editing their products, even though those products remain in the system.
 *
 * Every successful update to the product's attributes triggers the automatic creation of a new `shopping_mall_product_snapshots` record that captures the complete product state at that moment — including all variant data and image URLs — preserving the immutable historical record required for order accuracy and dispute resolution.
 *
 * The product must exist and must not be marked as deleted (`deleted_at` must be null) for the update to proceed. If the referenced category does not exist, the request is also rejected.
 *
 * Related operations that must be called separately for other aspects of product management include `POST /products/{productId}/images` for uploading product images, and variant management endpoints under `/products/{productId}/variants`.
 *
 * @param props.connection
 * @param props.productId The UUID of the product to update. Must be a product owned by the authenticated seller.
 * @param props.body Updated field values for the product's core attributes including name, description, base price, and category assignment.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the requesting seller from the
 *   session token. 2. Verify the seller's approval status — rejected or pending
 *   sellers cannot edit products. 3. Verify the seller's suspension status —
 *   suspended sellers cannot edit products. 4. Look up the product by
 *   `productId` (UUID) in `shopping_mall_products`. Return 404 if not found or
 *   if `deleted_at` is non-null. 5. Check that `shopping_mall_seller_id` on the
 *   product matches the authenticated seller's ID. Return 403 if ownership
 *   check fails. 6. If `categoryId` is provided in the request body (non-null),
 *   verify that it exists in `shopping_mall_categories`. Return 422/400 if the
 *   category does not exist. 7. Apply the updates: set `name`, `description`,
 *   `base_price`, and `shopping_mall_category_id` from the request body on the
 *   product record. Update `updated_at` to the current timestamp. 8. Within the
 *   same transaction, create a new `shopping_mall_product_snapshots` record
 *   capturing the complete current product state (all fields, all active
 *   variant data with their options, all current image URLs in sequence order).
 *   9. Commit the transaction. 10. Return the full updated
 *   `shopping_mall_products` record including related images and variants.
 * @path /shoppingMall/seller/products/:productId
 * @accessor api.functional.shoppingMall.seller.products.update
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
     * The UUID of the product to update. Must be a product owned by the authenticated seller.
     */
    productId: string & tags.Format<"uuid">;

    /**
     * Updated field values for the product's core attributes including name, description, base price, and category assignment.
     */
    body: IShoppingMallProduct.IUpdate;
  };
  export type Body = IShoppingMallProduct.IUpdate;
  export type Response = IShoppingMallProduct;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/seller/products/:productId",
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
    `/shoppingMall/seller/products/${encodeURIComponent(props.productId ?? "null")}`;
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
 * Removes a product listing from the shopping mall platform by marking it as deleted, excluding it from all customer-facing discovery surfaces.
 *
 * This operation sets the `deleted_at` timestamp on the target product record in the `shopping_mall_products` table, removing it from all customer-facing search results, category listings, and browsing surfaces. Sellers may only delete products they own; administrators may delete any product on the platform regardless of ownership.
 *
 * The deletion applies the following cascading effects: all associated product variants recorded in `shopping_mall_product_variants` are removed from active browsing and cart operations (their `deleted_at` is set), all inventory records linked to those variants are excluded from active tracking, and all wishlist items (`shopping_mall_wishlist_items`) that reference the product are deleted outright so that no customer's wishlist continues to display the removed product. Product images (`shopping_mall_product_images`) associated with the product are also removed from the active listing.
 *
 * Critically, this operation does NOT destroy any `shopping_mall_product_snapshots` records that were previously created for this product. Those immutable point-in-time snapshots remain fully intact and accessible to administrators for dispute resolution, order auditing, and historical review — even after the product itself has been marked as deleted.
 *
 * The system enforces pre-deletion safety checks. If any order item referencing a variant of this product currently has a status of 'paid' or 'shipped' (as recorded in `shopping_mall_order_items.status`), the deletion is rejected and the caller is informed that pending orders must be resolved first. Similarly, if any variant has an open cancellation or refund request awaiting response, the deletion is rejected until those post-sale workflows are completed.
 *
 * A seller attempting to delete a product owned by another seller will receive an authorization error. Administrators bypass ownership checks and may delete any product for policy violation enforcement or platform moderation purposes.
 *
 * Related operations: Use `GET /products/{productId}` to confirm the product's current state before deletion. Use `PATCH /products` to browse listings and confirm the product no longer appears after deletion.
 *
 * @param props.connection
 * @param props.productId The unique identifier (UUID) of the product to delete.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor seller
 * @x-autobe-specification 1. Authenticate the caller. Determine if the caller
 *   is a seller or an administrator. 2. Look up the product by `productId`
 *   (UUID) in `shopping_mall_products`. If not found or already soft-deleted
 *   (`deleted_at IS NOT NULL`), return 404. 3. Authorization check: - If caller
 *   is a seller: verify `shopping_mall_products.shopping_mall_seller_id`
 *   matches the authenticated seller's ID. If not, return 403. - If caller is
 *   an admin: skip ownership check. 4. Safety checks — query
 *   `shopping_mall_order_items` joined through `shopping_mall_product_variants`
 *   (via `shopping_mall_product_variant_id`) to find any order item with
 *   `status IN ('paid', 'shipped')` for any variant of this product. If found,
 *   return 422 with a message indicating pending orders must be resolved. 5.
 *   Check for open post-sale requests: query
 *   `shopping_mall_cancellation_requests` and `shopping_mall_refund_requests`
 *   linked to order items whose variant belongs to this product. If any are
 *   unresolved (pending state), return 422. 6. Execute deletion within a single
 *   database transaction: a. Set `shopping_mall_products.deleted_at = NOW()`
 *   and `shopping_mall_products.updated_at = NOW()` for the target product. b.
 *   Set `deleted_at = NOW()` on all active (`deleted_at IS NULL`) records in
 *   `shopping_mall_product_variants` where `shopping_mall_product_id =
 *   productId`. c. Delete all `shopping_mall_wishlist_items` where
 *   `shopping_mall_product_id = productId`. d. (Product images and inventory
 *   records are implicitly excluded from browsing; images are cascade-deleted
 *   per the DB relation `onDelete: Cascade` on product deletion if
 *   hard-deleting, or filtered out by the product's deleted_at if
 *   soft-deleting.) 7. Do NOT delete any `shopping_mall_product_snapshots`
 *   records. These must remain intact. 8. Return the deleted product record
 *   (with `deleted_at` set) as the response body.
 * @path /shoppingMall/seller/products/:productId
 * @accessor api.functional.shoppingMall.seller.products.erase
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
     * The unique identifier (UUID) of the product to delete.
     */
    productId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/seller/products/:productId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/seller/products/${encodeURIComponent(props.productId ?? "null")}`;
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
