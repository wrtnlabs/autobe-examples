import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { IPageIShoppingMallProductImage } from "../../../../structures/IPageIShoppingMallProductImage";
import { IShoppingMallProductImage } from "../../../../structures/IShoppingMallProductImage";

/**
 * Add a new image to a product’s image gallery for storefront display.
 *
 * This operation creates a row in `shopping_mall_product_images`, which stores one product image asset associated with exactly one `shopping_mall_products` record. The created record includes `href` (the public image URI/URL to render), `alt_text` (accessibility text), and `display_order` (the gallery ordering value where lower values appear earlier).
 *
 * Authorization is required: a seller may only manage images for products that belong to that seller. The service must verify ownership by comparing the target product’s `shopping_mall_seller_id` (from `shopping_mall_products`) with the authenticated seller identity before inserting the new image. If the seller attempts to add an image to a product they do not own, the operation must be rejected and must not partially apply any gallery changes.
 *
 * Business logic and validation rules:
 *
 * - The `shopping_mall_product_id` in the request must point to an existing product; otherwise the operation must fail.
 * - `href` is stored into `shopping_mall_product_images.href` and should be provided as a single URI/URL string.
 * - `alt_text` is stored into `shopping_mall_product_images.alt_text`.
 * - `display_order` controls ordering within the same product. If the request does not specify a display order, the service should assign a value that places the image at the end of the current non-deleted set.
 *
 * Snapshot/audit behavior:
 *
 * When the image creation successfully changes the product’s editable display state, the platform must follow the snapshot principle: create an immutable snapshot record capturing the relevant before/after product-image state after the write succeeds.
 *
 * Related operations:
 *
 * - The created image participates in ordering rules enforced by image reorder flows, where the first image acts as the main thumbnail in listing/detail contexts.
 * - Deletion/reordering operations should be consistent with the `display_order` values produced here; failed reorder/deletion attempts must not create misleading snapshots or inconsistent thumbnail references.
 *
 * @param props.connection
 * @param props.body Creation payload for a new product image entry in the product’s image gallery.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement POST /productImages.
 *
 * 1) Authenticate actor and authorize.
 *    - Require `member` acting as seller.
 *    - The request contains a `shopping_mall_product_id` inside the create DTO.
 *    - Fetch the target product from `shopping_mall_products` by `id`.
 *    - Verify the product’s `shopping_mall_seller_id` matches the authenticated seller member id.
 *    - If mismatch or product missing: return an authorization/validation error (no DB mutation).
 *
 * 2) Validate and normalize inputs.
 *    - Validate `href` length to fit `@db.VarChar(80000)`.
 *    - Validate `alt_text` per DTO rules.
 *    - Handle `display_order`:
 *      - If provided: use it as-is (ensure it’s an integer).
 *      - If not provided: compute the next order as `max(display_order) + 1` among existing `shopping_mall_product_images` rows for the same product where `deleted_at` is null (only active images).
 *
 * 3) Insert row into `shopping_mall_product_images`.
 *    - Create new `shopping_mall_product_images` record with:
 *      - `shopping_mall_product_id`
 *      - `href`
 *      - `alt_text`
 *      - `display_order`
 *      - `deleted_at` set to null
 *      - `created_at`/`updated_at` set by server.
 *
 * 4) Snapshot creation (after successful insert).
 *    - Because product image set/order is snapshot-applicable editable state, create a product-related snapshot capturing the before-and-after view of images when insertion succeeds.
 *    - Use the generic snapshot tables (`shopping_mall_snapshots` + payload tables) in a transaction so that snapshot creation is consistent with the product-image write.
 *
 * 5) Concurrency/consistency notes.
 *    - If multiple image creations happen concurrently for the same product and no explicit `display_order` is given, ensure the computed “next order” does not conflict by performing order calculation and insert within a transaction with appropriate isolation (or re-check and adjust upon unique constraints if any are enforced elsewhere).
 *
 * 6) Error handling.
 *    - If any validation/authorization fails, do not insert the image record and do not create snapshots.
 *    - If snapshot creation fails after insertion, roll back the transaction so neither the image row nor snapshot artifacts remain.
 *
 * Return the created `shopping_mall_product_images` row mapped to the response DTO.
 * @path /shoppingMall/member/productImages
 * @accessor api.functional.shoppingMall.member.productImages.create
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
     * Creation payload for a new product image entry in the product’s image gallery.
     */
    body: IShoppingMallProductImage.ICreate;
  };
  export type Body = IShoppingMallProductImage.ICreate;
  export type Response = IShoppingMallProductImage;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/member/productImages",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/productImages";
  export const random = (): IShoppingMallProductImage =>
    typia.random<IShoppingMallProductImage>();
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
 * Retrieve and operate on product image records in a seller-controlled storefront catalog context via a single endpoint that supports complex request criteria.
 *
 * This operation is designed around {@link shopping_mall_product_images}, where each record represents one image asset associated with exactly one {@link shopping_mall_products} entry. The system uses image ordering (via {@link shopping_mall_product_images.display_order}) to determine the sequence in which images are presented to customers, including which image is treated as the main thumbnail when applicable.
 *
 * For seller use cases, the platform enforces that a seller can manage images only for products that belong to that seller ({@link shopping_mall_products.shopping_mall_seller_id}). If a seller attempts to reorder or delete images for a product they do not own, the system must reject the attempt and must not partially apply changes; the product’s image set and display ordering must remain exactly as before.
 *
 * When image reorder operations are applied successfully, the ordering update must be reflected in subsequent customer browsing starting with the next view, ensuring that the main thumbnail selection follows the rules: the first remaining image (by display order) becomes the main thumbnail; if no images remain after an edit, no main-thumbnail reference must be presented.
 *
 * Snapshot integrity is critical. If an image edit request fails due to validation/authorization rules (for example, missing image references or disallowed product ownership), the system must not create a product snapshot that implies an image order or image set change.
 *
 * This endpoint supports paginated retrieval of matching ProductImage records to drive UI rendering and seller-side reorder interactions. Clients can supply search and pagination parameters, and the service layer must return an ordered, paginated summary.
 *
 * Related operations:
 *
 * - Reordering logic for seller images depends on the correctness of persisted {@link shopping_mall_product_images.display_order} values and the authorization scope derived from {@link shopping_mall_products.shopping_mall_seller_id}.
 *
 * Error handling expectations:
 *
 * - If authorization fails for the target product, respond with an authorization/permission error and do not apply any modifications.
 * - If referenced images are missing, reject the operation without changing existing image ordering.
 * - If concurrent reorder operations would result in ambiguous/inconsistent ordering, reject one request and keep the final ordering produced by the successful operation.
 *
 * @param props.connection
 * @param props.body Search criteria and pagination options for product images, optionally scoped to a specific product for seller image management flows (including reorder context).
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a PATCH-based list/search for ProductImage
 *   with optional seller-scoped filtering.
 *
 * Algorithm:
 * 1. Parse the request body as ShoppingMallProductImage.IRequest.
 * 2. Determine the effective scope:
 *    - If the request includes shoppingMallProductId (or equivalent product identifier), join shopping_mall_products to obtain shopping_mall_products.shopping_mall_seller_id and verify it matches the authenticated seller.
 *    - If no product scope is provided, restrict by authorization to images belonging to the authenticated seller’s products (enforced via join and seller id).
 * 3. Apply filtering:
 *    - Filter by product id, href (or alt_text) keywords, and/or deleted_at state if request supports it.
 * 4. Apply pagination and sorting:
 *    - Default sort to shopping_mall_product_images.display_order asc, with tiebreaker on shopping_mall_product_images.created_at desc.
 * 5. If the request includes reorder-related instructions (e.g., a new display order mapping), validate all referenced image IDs exist and belong to the same scoped product, then apply updates atomically in a transaction:
 *    - Reject if any image ID does not exist.
 *    - Reject if any image belongs to a different product than the request scope.
 *    - Prevent ambiguous concurrent ordering by applying an optimistic concurrency check (e.g., compare updated_at) when request provides it; if mismatch indicates conflict, reject.
 *    - After updating display_order values, ensure that the ordering is consistent (unique order values per product if the implementation enforces it; otherwise normalize by sorting and reassigning contiguous display_order).
 * 6. Snapshot behavior:
 *    - Only create product snapshots after successful validation and successful persistence of reorder changes.
 *    - On any validation/authorization failure, do not create snapshots.
 * 7. Return a paginated list of IShoppingMallProductImage.ISummary for the affected or filtered image set.
 *
 * Database queries:
 * - Base query from shopping_mall_product_images.
 * - Join shopping_mall_products on shopping_mall_product_id to validate seller ownership.
 * - For summaries, select only fields needed by IShoppingMallProductImage.ISummary.
 *
 * Transactions:
 * - Use a single transaction for reorder updates when applied.
 *
 * Edge cases:
 * - If the reorder/delete logic results in zero remaining images for a product, ensure subsequent client rendering has no main-thumbnail reference; do not return an invalid main-thumbnail indicator in the summaries.
 * - Ensure rejected requests do not modify display_order or create misleading snapshot records.
 * @path /shoppingMall/member/productImages
 * @accessor api.functional.shoppingMall.member.productImages.index
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
     * Search criteria and pagination options for product images, optionally scoped to a specific product for seller image management flows (including reorder context).
     */
    body: IShoppingMallProductImage.IRequest;
  };
  export type Body = IShoppingMallProductImage.IRequest;
  export type Response = IPageIShoppingMallProductImage.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/member/productImages",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/member/productImages";
  export const random = (): IPageIShoppingMallProductImage.ISummary =>
    typia.random<IPageIShoppingMallProductImage.ISummary>();
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
 * Retrieve detailed information for a single product image.
 *
 * This endpoint targets the product image asset entity stored in `shopping_mall_product_images`, identified by its primary key (`id`). The retrieved data is used to render image gallery content for product pages, and it includes the image asset reference (`href`), accessibility metadata (`alt_text`), ordering within the product image set (`display_order`), and timestamps.
 *
 * Authorization-wise, the operation is intended for authenticated/authorized contexts that can view product image assets within the platform. The exact actor access is enforced in the service layer based on ownership and/or visibility rules for the parent `shopping_mall_products` record.
 *
 * Validation and lookup rules:
 *
 * - If `id` does not exist, the system returns a not-found style outcome.
 * - The response reflects the current stored state of the `shopping_mall_product_images` record; if an image is marked deleted via `deleted_at`, the caller must rely on higher-level listing/detail visibility rules for whether the image should be exposed.
 *
 * Related behavior:
 *
 * - This operation complements seller image management workflows (uploading/reordering/deleting images) which update the underlying image rows and rely on correct image ordering for main-thumbnail selection.
 * - Customer browsing and product detail rendering typically uses the product’s current image set ordering rather than fetching images individually; those flows should remain consistent with this single-image retrieval.
 *
 * Error handling:
 *
 * - Invalid path parameter values result in a validation error.
 * - Missing records result in a not-found outcome.
 *
 * @param props.connection
 * @param props.productImageId Target product image ID.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps:
 *
 * 1. Parse and validate `productImageId` from the path as UUID.
 * 2. Query `shopping_mall_product_images` by `id = productImageId`.
 * 3. Join to `shopping_mall_products` if needed to enforce visibility/ownership rules (e.g., ensure the parent product is accessible to the requesting actor). Use the relationship defined by `shopping_mall_product_id` -> `shopping_mall_products.id`.
 * 4. If no row exists, return not-found outcome.
 * 5. Map the row fields to the response DTO:
 *    - id
 *    - shopping_mall_product_id (as productId in DTO if the DTO includes it; otherwise omit consistently with schema)
 *    - href, alt_text, display_order, created_at, updated_at, deleted_at (only if DTO includes it and is allowed by the API contract).
 * 6. Return HTTP 200 with the resource payload.
 *
 * Edge cases:
 *
 * - If the image exists but is marked as deleted (`deleted_at` is not null), still return it only if the service-layer visibility rules allow; otherwise return not-found or forbidden as per the access policy used for product image exposure.
 * @path /shoppingMall/member/productImages/:productImageId
 * @accessor api.functional.shoppingMall.member.productImages.at
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
     * Target product image ID.
     */
    productImageId: string & tags.Format<"uuid">;
  };
  export type Response = IShoppingMallProductImage;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/member/productImages/:productImageId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/productImages/${encodeURIComponent(props.productImageId ?? "null")}`;
  export const random = (): IShoppingMallProductImage =>
    typia.random<IShoppingMallProductImage>();
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
      assert.param("productImageId")(() => typia.assert(props.productImageId));
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
 * Update a specific product image asset within a seller’s product image set.
 *
 * This endpoint is intended for the seller-side product management workflow where the seller edits the stored image metadata for one image entry that belongs to their product. In the underlying data model, product images are stored in `shopping_mall_product_images`, with the row identified by `id`, and linked to exactly one product via `shopping_mall_product_id`.
 *
 * The update operation must enforce authorization boundaries: a seller can only update product images for products that belong to that seller (the seller owns the target product via `shopping_mall_products.shopping_mall_seller_id`). If a seller attempts to update an image for a product they do not own, the system must reject the request and must not alter the image record.
 *
 * When updating image ordering (`display_order`), the system must preserve the storefront consistency rule that the first image in the seller-defined order is treated as the main/thumbnail image. If the update changes ordering such that the first position becomes invalid (e.g., because no images remain after a deletion), subsequent behavior must ensure no main-thumbnail reference is presented; for an update, this means ordering must remain coherent and must be validated against the existing image set.
 *
 * If the update fails due to validation or authorization errors, the system must ensure snapshot/audit integrity: it must not create incorrect product history that misrepresents the before/after image set and ordering. Concurrent ordering updates must be handled so that conflicting reorder intentions do not result in an ambiguous final ordering.
 *
 * For related operations, this update complements product image upload and deletion flows (which create/modify the image set) and reorder flows (which adjust `display_order` ordering). Listing storefront-visible images is expected to use product browsing APIs rather than this write endpoint.
 *
 * Expected outcomes:
 * - On success, returns the updated product image record.
 * - On rejection, returns an error outcome indicating the modification is not allowed or the input is invalid.
 *
 *
 * @param props.connection
 * @param props.productImageId Target product image ID to update.
 * @param props.body Updated product image data.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implementation steps: 1) Parse `productImageId` from
 *   path. 2) Load `shopping_mall_product_images` by `id = productImageId`. 3)
 *   Join/load the owning product from `shopping_mall_products` using
 *   `shopping_mall_product_id`. 4) Authorization: verify the authenticated
 *   seller (member with seller role) matches
 *   `shopping_mall_products.shopping_mall_seller_id`. If not, reject with an
 *   authorization/ownership error. 5) Validate request payload fields: - Ensure
 *   `href` (if provided) is a valid, non-empty URL/URI string per DTO
 *   constraints. - Ensure `alt_text` (if provided) meets DTO constraints. -
 *   Ensure `display_order` (if provided) is an integer within allowed DTO
 *   range. 6) Apply update to `shopping_mall_product_images` fields (id remains
 *   unchanged; `shopping_mall_product_id` must not be changed by client input).
 *   7) Ordering consistency: - If `display_order` is updated, ensure it does
 *   not violate any business rule about image ordering for the product. If
 *   business rules require unique ordering positions, enforce it by
 *   shifting/renumbering within the same `shopping_mall_product_id`; otherwise
 *   persist as-is but verify that storefront display will correctly treat the
 *   minimum `display_order` as main thumbnail. 8) Concurrency handling: - Use
 *   an optimistic concurrency strategy if the underlying DTO supports it (e.g.,
 *   updated_at/version) or enforce ordering update within a transaction using
 *   appropriate row locking for the same `shopping_mall_product_id` to prevent
 *   ambiguous outcomes. 9) Transaction: perform the update in a database
 *   transaction; only after successful validation and write, return the updated
 *   row. 10) Snapshot/audit integrity: - If the system maintains product
 *   snapshot history for product image edits, create/update snapshot entries
 *   only after the write succeeds. Never create snapshot history if
 *   authorization/validation fails. Edge cases: - Image id does not exist →
 *   return not-found. - Seller suspended/banned → reject per actor rules. -
 *   Update attempts to change product association → reject.
 *
 * @path /shoppingMall/member/productImages/:productImageId
 * @accessor api.functional.shoppingMall.member.productImages.updateProductImage
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function updateProductImage(
  connection: IConnection,
  props: updateProductImage.Props,
): Promise<updateProductImage.Response> {
  return true === connection.simulate
    ? updateProductImage.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...updateProductImage.METADATA,
          path: updateProductImage.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace updateProductImage {
  export type Props = {
    /**
     * Target product image ID to update.
     */
    productImageId: string & tags.Format<"uuid">;

    /**
     * Updated product image data.
     */
    body: IShoppingMallProductImage.IUpdate;
  };
  export type Body = IShoppingMallProductImage.IUpdate;
  export type Response = IShoppingMallProductImage;

  export const METADATA = {
    method: "PUT",
    path: "/shoppingMall/member/productImages/:productImageId",
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
    `/shoppingMall/member/productImages/${encodeURIComponent(props.productImageId ?? "null")}`;
  export const random = (): IShoppingMallProductImage =>
    typia.random<IShoppingMallProductImage>();
  export const simulate = (
    connection: IConnection,
    props: updateProductImage.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: updateProductImage.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("productImageId")(() => typia.assert(props.productImageId));
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
 * Permanently removes a single product image asset from a specific product’s current image set for subsequent customer storefront views.
 *
 * This operation targets the `shopping_mall_product_images` row identified by `id`. Each row represents one storefront-rendered image with a `href` (public URL/URI), `alt_text`, and a `display_order` used to determine ordering among images of the same product. Because `shopping_mall_product_images` can be marked deleted via `deleted_at`, the system treats image removal as an update in the product image collection that should immediately affect active storefront listing/detail pages.
 *
 * Security and authorization: this endpoint is available to sellers to manage images only for products they own. The system must reject deletion attempts when the target image belongs to a product owned by a different seller, without partially applying any changes. Rejected attempts must not create product snapshots reflecting image set changes.
 *
 * Snapshot integrity and consistency: if the deletion attempt fails due to validation or authorization rules (including attempting to delete an image for another seller’s product, or deleting a non-existent image), the system must not create a misleading product snapshot that implies the image order or image set changed. If deletion is requested for a non-existent (or already removed) image, the system returns a not-found style outcome and must not affect the rest of the product’s images.
 *
 * Thumbnail/order behavior: when the main thumbnail image is removed, the system must ensure the main thumbnail automatically becomes the next first image by `display_order` among the remaining images. This ensures the storefront does not display obsolete thumbnails after deletion.
 *
 * Related operations: sellers typically use this endpoint together with image reorder/upload operations for `shopping_mall_product_images` and may also view affected product state via product endpoints. For history and dispute resolution, the system relies on immutable snapshot records; this endpoint must only create valid snapshots when the operation actually succeeds.
 *
 * Expected outcomes:
 * - 200/204 on successful removal of the target image.
 * - Not-found style outcome when the image id does not exist for the product context.
 * - Authorization-denied outcome when a seller attempts to delete an image for a product they do not own, with no changes to image set and no incorrect snapshot creation.
 *
 * @param props.connection
 * @param props.productImageId Target product image id to remove from its product’s active image set.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification 1) Input: Read `productImageId` from path.
 *
 * 2) Ownership lookup:
 * - Query `shopping_mall_product_images` by `id = productImageId`.
 * - Join to `shopping_mall_products` through `shopping_mall_product_id` → `shopping_mall_products.id`.
 * - Verify the authenticated seller’s identity owns the product (`shopping_mall_products.shopping_mall_seller_id`).
 *
 * 3) Missing image handling:
 * - If no `shopping_mall_product_images` row exists for that `id`, return a not-found style outcome.
 * - Do not alter any other images for the product.
 * - Do not create any product snapshots.
 *
 * 4) Authorization failure:
 * - If the seller does not own the joined product, reject the request.
 * - Ensure the product’s current images order and image set remain exactly unchanged.
 * - Do not create snapshots that would misrepresent image changes.
 *
 * 5) Deletion application:
 * - Apply removal to the target image row (respect the schema’s deletion mechanism via `deleted_at`).
 * - Ensure only the targeted image is removed.
 *
 * 6) Thumbnail/order consistency:
 * - After deletion, determine whether the removed image was the primary/first thumbnail (based on ordering by `display_order` among non-deleted images).
 * - If it was the first image, the product’s storefront thumbnail should now resolve to the next smallest `display_order` among remaining non-deleted images; do not leave gaps that would cause null thumbnails.
 *
 * 7) Snapshot creation (only on success):
 * - If the broader domain snapshot mechanism requires creating/updating `shopping_mall_snapshots`/payloads for product image set changes, create snapshots only after the deletion succeeds and after all consistency rules are satisfied.
 *
 * 8) Transactionality:
 * - Execute lookup, authorization, deletion, and any snapshot creation within a single transaction so that partial application never occurs.
 *
 * 9) Response:
 * - For successful deletion, return a successful outcome with no response body (responseBody: null).
 * @path /shoppingMall/member/productImages/:productImageId
 * @accessor api.functional.shoppingMall.member.productImages.erase
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
     * Target product image id to remove from its product’s active image set.
     */
    productImageId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/shoppingMall/member/productImages/:productImageId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/shoppingMall/member/productImages/${encodeURIComponent(props.productImageId ?? "null")}`;
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
      assert.param("productImageId")(() => typia.assert(props.productImageId));
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
