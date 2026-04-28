import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallProductVariant } from "../../../../../api/structures/IShoppingMallProductVariant";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { deleteShoppingMallSellerProductsProductIdVariantsVariantId } from "../../../../../providers/deleteShoppingMallSellerProductsProductIdVariantsVariantId";
import { postShoppingMallSellerProductsProductIdVariants } from "../../../../../providers/postShoppingMallSellerProductsProductIdVariants";
import { putShoppingMallSellerProductsProductIdVariantsVariantId } from "../../../../../providers/putShoppingMallSellerProductsProductIdVariantsVariantId";

@Controller("/shoppingMall/seller/products/:productId/variants")
export class ShoppingmallSellerProductsVariantsController {
  /**
   * Add a new purchasable variant to an existing product owned by the authenticated seller.
   *
   * This operation creates a new record in the `shopping_mall_product_variants` table under the specified parent product, and simultaneously creates one or more `shopping_mall_product_variant_options` child records that define the variant's configuration dimensions (e.g., color: Red, size: Large). A variant is the atomic, independently-managed purchasable unit of a product — each combination of option values constitutes a distinct variant that customers can browse, add to cart, and purchase.
   *
   * The seller must own the product identified by `productId`. If the product belongs to a different seller, the request is rejected. This ownership boundary is strictly enforced: no seller may add variants to another seller's product catalog.
   *
   * The `sku` field provided in the request body must be unique across the entire platform — no two variants from any seller may share the same SKU code. The system validates SKU uniqueness before creating the variant and returns an error if a conflict is detected.
   *
   * At least one option key-value pair must be provided to define the variant's distinguishing configuration. Option keys (e.g., 'color', 'size', 'material') are free-form strings chosen by the seller; the platform does not enforce a fixed vocabulary. The combination of all option pairs for a variant must form a configuration not already present among the product's existing active variants.
   *
   * The `priceOverride` field is optional. When provided, it replaces the parent product's `base_price` for purchases of this specific variant. When omitted, the parent product's base price applies automatically. This mechanism allows sellers to offer configuration-specific pricing (e.g., larger sizes cost more).
   *
   * Upon successful creation, the new variant begins with a stock quantity of zero, derived from the `shopping_mall_inventory_records` ledger. The variant is not purchasable until the seller adds inventory to it. Customers will see the variant but will not be able to add it to a cart until its stock is greater than zero.
   *
   * Creating a variant also triggers automatic creation of a new `shopping_mall_product_snapshots` record by the system, preserving the immutable product state required for order accuracy and dispute resolution.
   *
   * Sellers may add variants at any time — including after the product is published and visible to customers. A product that previously had no active variants becomes purchasable once this operation creates its first active variant with sufficient inventory.
   *
   * Related operations:
   * - `GET /products/{productId}/variants/{variantId}` to retrieve the created variant's details.
   * - `POST /products/{productId}/variants/{variantId}/inventory` to add inventory stock to the new variant.
   * - `PUT /products/{productId}/variants/{variantId}` to update the variant's attributes after creation.
   *
   * @param connection
   * @param productId The UUID of the parent product to which the new variant will be added. The authenticated seller must own this product.
   * @param body Variant creation payload including the globally unique SKU, one or more option key-value pairs defining the variant's configuration, and an optional price override.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authentication & Authorization: - Require
     *   authenticated seller session. - Load the product by productId from
     *   shopping_mall_products where id = productId AND deleted_at IS NULL. -
     *   Verify shopping_mall_products.shopping_mall_seller_id matches the
     *   authenticated seller's ID. Return 403 Forbidden if not.
   *
   * 2. Request Validation:
   *    - Validate that sku is non-empty and unique across ALL shopping_mall_product_variants (@@unique([sku])). Return 409 Conflict if a variant with the same SKU already exists.
   *    - Validate that at least one option object is provided in the options array.
   *    - Validate that each option has a non-empty key and non-empty value.
   *    - Validate that no two options in the request share the same key (unique per (product_variant_id, key) constraint in shopping_mall_product_variant_options).
   *    - Optionally validate that the new option combination does not duplicate an existing active variant (deleted_at IS NULL) of the same product.
   *    - If priceOverride is provided, validate it is a positive numeric value.
   *
   * 3. Database Writes (within a single transaction):
   *    a. Insert a row into shopping_mall_product_variants:
   *       - id: new UUID
   *       - shopping_mall_product_id: productId
   *       - sku: from request body
   *       - price_override: from request body (null if omitted)
   *       - created_at: current timestamp
   *       - updated_at: current timestamp
   *       - deleted_at: null
   *    b. For each option in the request body options array, insert a row into shopping_mall_product_variant_options:
   *       - id: new UUID
   *       - product_variant_id: the new variant's id
   *       - key: option.key
   *       - value: option.value
   *       - sequence: option.sequence or auto-increment from 0
   *       - created_at: current timestamp
   *    c. After the variant is created, trigger creation of a new shopping_mall_product_snapshots record capturing the current state of the product and all its variants (including the newly created one).
   *
   * 4. Response:
   *    - Return the full newly created variant record including all options with HTTP 201 Created.
   *    - The returned variant should include: id, sku, priceOverride, options (array of key/value/sequence), createdAt, updatedAt, deletedAt (null).
   *
   * 5. Edge Cases:
   *    - If productId does not exist or is deleted (deleted_at IS NOT NULL), return 404 Not Found.
   *    - If the authenticated user is not a seller, return 403 Forbidden.
   *    - If SKU uniqueness constraint is violated at DB level, catch the unique constraint error and return 409 Conflict.
   *    - If duplicate option key is detected in the request, return 400 Bad Request.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductVariant.ICreate,
  ): Promise<IShoppingMallProductVariant> {
    try {
      return await postShoppingMallSellerProductsProductIdVariants({
        seller,
        productId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update an existing product variant belonging to the specified product.
   *
   * This operation allows a seller to modify a specific variant of their own product. A product variant, stored in the `shopping_mall_product_variants` table, represents one purchasable configuration of a product — defined by a unique SKU code and one or more option key-value pairs (e.g., color: Red, size: Large) stored in `shopping_mall_product_variant_options`. The seller may update the SKU code, the optional price override, and the full set of option dimensions for the variant.
   *
   * Ownership is strictly enforced: only the seller who owns the parent product (`shopping_mall_products.shopping_mall_seller_id`) may update its variants. If the authenticated seller does not own the product identified by `productId`, the request is rejected. Administrators retain oversight authority and may update any variant regardless of product ownership.
   *
   * The SKU code (`sku` field in `shopping_mall_product_variants`) must remain unique across the entire platform after the update. If the new SKU value conflicts with an existing variant's SKU on any other product, the update is rejected. Additionally, each option key must be unique within the submitted set of options for this variant, matching the database constraint on `shopping_mall_product_variant_options`.
   *
   * Updating any attribute of a variant automatically triggers the creation of a new `shopping_mall_product_snapshots` record, preserving the complete product state — including all variants and their updated options — as an immutable historical record. This ensures ongoing order accuracy and dispute resolution integrity.
   *
   * The variant's stock level is not affected by this operation; stock is managed separately through inventory records (`shopping_mall_inventory_records`). The variant's `deleted_at` field is not alterable through this endpoint — use the dedicated delete endpoint to remove a variant.
   *
   * Pre-requisites: Retrieve the product details and the current variant state using the corresponding GET endpoints before performing this update, to confirm the variant exists and is not already deleted.
   *
   * @param connection
   * @param productId The UUID of the product that owns the variant being updated (global scope).
   * @param variantId The UUID of the product variant to update (scoped to the specified product).
   * @param body Updated fields for the product variant including SKU code, optional price override, and full option key-value configuration.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authenticate the requesting actor as a seller
     *   or administrator. 2. Look up the product by `productId` (UUID) in
     *   `shopping_mall_products`. Return 404 if not found or if `deleted_at` is
     *   set. 3. For seller actors, verify that
     *   `shopping_mall_products.shopping_mall_seller_id` matches the
     *   authenticated seller's ID. Return 403 if ownership check fails.
     *   Administrators bypass this check. 4. Look up the variant by `variantId`
     *   (UUID) in `shopping_mall_product_variants` where
     *   `shopping_mall_product_id = productId` AND `deleted_at IS NULL`. Return
     *   404 if not found. 5. Validate the request body: a. `sku`: Must be
     *   non-empty. Check platform-wide uniqueness in
     *   `shopping_mall_product_variants.sku` excluding the current variant.
     *   Return 409 if duplicate SKU found. b. `price_override`: Optional float;
     *   if provided must be >= 0. c. `options`: Array of option key-value
     *   pairs. Each option must have a non-empty `key` and `value`. Validate
     *   that `key` values are unique within the submitted options array (no
     *   duplicate keys for the same variant). 6. Within a database transaction:
     *   a. Update `shopping_mall_product_variants` record: set `sku`,
     *   `price_override`, and `updated_at = NOW()`. b. Delete all existing
     *   `shopping_mall_product_variant_options` records for this variant. c.
     *   Insert new `shopping_mall_product_variant_options` records with the
     *   provided key-value pairs and computed `sequence` from their array
     *   position. d. Create a new `shopping_mall_product_snapshots` record
     *   capturing the current full product state including all variants. 7.
     *   Return the updated variant with its options as
     *   `IShoppingMallProductVariant`.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":variantId")
  public async update(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallProductVariant.IUpdate,
  ): Promise<IShoppingMallProductVariant> {
    try {
      return await putShoppingMallSellerProductsProductIdVariantsVariantId({
        seller,
        productId,
        variantId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Remove a specific product variant from a seller's product listing.
   *
   * This operation marks the target variant record in `shopping_mall_product_variants` as deleted by setting its `deleted_at` timestamp to the current time. Once deleted, the variant is immediately excluded from all customer-facing product listings, search results, and category browsing. Any customer who had this variant queued in their shopping cart will have the cart entry's `availability_status` set to `'variant_deleted'`, preventing it from being carried through to checkout while still informing the customer of what changed.
   *
   * The requesting seller must be the owner of the parent product (identified by `productId`). The system validates that `shopping_mall_products.shopping_mall_seller_id` matches the authenticated seller's identity before proceeding. If the seller does not own the product, the request is rejected. Suspended sellers are also prevented from deleting variants.
   *
   * Deletion is subject to safety constraints based on the current state of associated order items. The operation will be rejected if any order item linked to this variant has a status of `paid` or `shipped`, since those items represent active fulfillment obligations. Additionally, if there are any pending cancellation requests or pending refund requests for order items referencing this variant, the deletion is also blocked until those requests are resolved.
   *
   * All historical data is preserved upon deletion. Existing `shopping_mall_product_snapshots`, `shopping_mall_product_snapshot_skuses`, and `shopping_mall_order_item_snapshots` that reference this variant remain intact and are never purged. This ensures the complete audit trail is accessible for dispute resolution, order history review, and compliance purposes.
   *
   * Administrators may also invoke this operation on any variant regardless of which seller owns the parent product, as administrators retain platform-wide oversight authority over all product catalog operations.
   *
   * @param connection
   * @param productId The UUID of the parent product that owns the variant. Used to validate seller ownership before executing the deletion.
   * @param variantId The UUID of the product variant to be deleted.
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification 1. Authenticate the requesting actor. Accept both
     *   seller (member) and admin (admin) actors. 2. Look up the product by
     *   productId in shopping_mall_products. Return 404 if not found or if
     *   deleted_at is already set. 3. If the actor is a seller: verify
     *   shopping_mall_products.shopping_mall_seller_id matches the
     *   authenticated seller's ID. Return 403 if mismatch. Also verify the
     *   seller is not suspended; return 403 if suspended. 4. Look up the
     *   variant by variantId in shopping_mall_product_variants where
     *   shopping_mall_product_id = productId. Return 404 if not found or if
     *   deleted_at is already set. 5. Check for blocking order items: query
     *   shopping_mall_order_items where shopping_mall_product_variant_id =
     *   variantId AND status IN ('paid', 'shipped'). If any rows exist, return
     *   422 with error indicating pending orders must be resolved. 6. Check for
     *   pending cancellation requests: join shopping_mall_order_items →
     *   shopping_mall_cancellation_requests where order item variant =
     *   variantId AND cancellation_requests status = 'pending'. If any exist,
     *   return 422. 7. Check for pending refund requests: join
     *   shopping_mall_order_items → shopping_mall_refund_requests where order
     *   item variant = variantId AND refund_requests status = 'pending'. If any
     *   exist, return 422. 8. All checks passed: set
     *   shopping_mall_product_variants.deleted_at = NOW() and updated_at =
     *   NOW() within a database transaction. 9. Mark all
     *   shopping_mall_cart_items referencing this variant as unavailable (per
     *   CartItem rules — set the cart item's availability flag or equivalent
     *   column to indicate the variant is no longer purchasable). 10. Do NOT
     *   delete shopping_mall_product_snapshots,
     *   shopping_mall_product_snapshot_skuses,
     *   shopping_mall_order_item_snapshots, or any historical records. These
     *   are preserved for audit and order history. 11. Return HTTP 204 No
     *   Content on success.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":variantId")
  public async erase(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedParam("variantId")
    variantId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteShoppingMallSellerProductsProductIdVariantsVariantId({
        seller,
        productId,
        variantId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
