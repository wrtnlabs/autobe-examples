import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallProductVariant } from "../../../../../api/structures/IEcommerceMallProductVariant";
import { SellerAuth } from "../../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../../decorators/payload/SellerPayload";
import { deleteEcommerceMallSellerProductsProductIdVariantsVariantId } from "../../../../../providers/deleteEcommerceMallSellerProductsProductIdVariantsVariantId";
import { postEcommerceMallSellerProductsProductIdVariants } from "../../../../../providers/postEcommerceMallSellerProductsProductIdVariants";
import { putEcommerceMallSellerProductsProductIdVariantsVariantId } from "../../../../../providers/putEcommerceMallSellerProductsProductIdVariantsVariantId";

@Controller("/ecommerceMall/seller/products/:productId/variants")
export class EcommercemallSellerProductsVariantsController {
  /**
   * Create a new product variant for a specific product in the ecommerce mall catalog.
   *
   * This operation allows sellers to add SKU variants to their products, enabling customers to purchase products with different options such as color, size, or material. Each variant represents a unique product configuration with its own SKU code, optional price override, and stock quantity. Variants are stored in the `ecommerce_mall_product_variants` table with option values normalized into `ecommerce_mall_product_variant_options` for 1NF compliance.
   *
   * **Business Requirements**:
   *
   * - The product must exist and have 'active' status to accept variants (verified against `ecommerce_mall_products.status` and `deleted_at` fields)
   * - Only the product owner (seller) can create variants for their products (validated via `seller_id` foreign key relationship)
   * - Each variant requires a unique SKU code across the entire platform (`sku_code` has global unique constraint)
   * - At least one option value (e.g., color, size) must be specified for each variant (stored as key-value pairs in `ecommerce_mall_product_variant_options`)
   * - Stock quantity starts at the specified value and is tracked through inventory records (`stock_quantity` field on variant, with history in `ecommerce_mall_inventory_records`)
   * - Price override is optional; if not specified, the product's base price is used (`price` field is nullable, falls back to `ecommerce_mall_products.base_price`)
   *
   * **Validation Rules**:
   *
   * - Product existence and active status verification (check `status = 'active'` and `deleted_at IS NULL`)
   * - Seller ownership validation against the product's `seller_id` foreign key
   * - SKU code uniqueness check across all variants including soft-deleted (`sku_code` unique constraint)
   * - Option values array must contain at least one key-value pair (enforced by unique constraint on `[ecommerce_mall_product_variant_id, key]`)
   * - Stock quantity must be zero or positive (`stock_quantity` integer field validation)
   * - Price override, if provided, must be a positive decimal value (`price` Float field validation)
   *
   * **Related Operations**:
   *
   * - `GET /ecommerceMall/seller/products/{productId}` - Retrieve product details before adding variants
   * - `PATCH /ecommerceMall/seller/products/{productId}/variants` - List/search existing variants for the product
   * - `PUT /ecommerceMall/seller/products/{productId}/variants/{variantId}` - Update an existing variant
   * - `DELETE /ecommerceMall/seller/products/{productId}/variants/{variantId}` - Remove a variant (soft delete with `deleted_at`)
   *
   * **Post-Creation Behavior**:
   *
   * - The variant becomes immediately available for purchase if stock quantity > 0 (`stock_quantity` > 0)
   * - A product snapshot is created in `ecommerce_mall_product_snapshots` to capture the new variant state for audit trail
   * - An initial inventory record is created in `ecommerce_mall_inventory_records` to track the stock quantity change
   * - The product becomes purchasable if this is the first variant (minimum variant requirement satisfied)
   *
   * **Error Conditions**:
   *
   * - Product not found or inactive: Return 404 (product doesn't exist) or 400 (status != 'active' or deleted_at != null)
   * - Unauthorized seller: Return 403 (seller_id doesn't match authenticated user)
   * - Duplicate SKU code: Return 409 (sku_code unique constraint violation)
   * - Missing or invalid option values: Return 400 (empty option values array or invalid key-value format)
   * - Invalid stock quantity or price: Return 400 (stock_quantity < 0 or price <= 0)
   *
   * @param connection
   * @param productId Target product's ID (global scope)
   * @param body Variant creation information including SKU code, option values (key-value pairs for 1NF compliance), stock quantity, and optional price override
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Create a new product variant for the specified product.
   *
   * Implementation steps:
   * 1. Validate the product exists and is active (status = 'active')
   * 2. Verify the authenticated seller owns the product (seller_id matches)
   * 3. Check SKU code uniqueness across all variants (including soft-deleted)
   * 4. Validate option values array is not empty
   * 5. Validate stockQuantity >= 0
   * 6. Validate price override (if provided) > 0
   * 7. Begin transaction:
   *    - Insert variant record with generated UUID
   *    - Insert variant option records (one per option key-value pair)
   *    - Create product snapshot capturing new variant
   *    - Create initial inventory record for stock quantity
   * 8. Return created variant with all option values
   *
   * Validation rules:
   * - Product must exist and be active
   * - Seller must own the product
   * - SKU code must be globally unique
   * - At least one option value required
   * - Stock quantity must be non-negative
   * - Price override must be positive if specified
   *
   * Edge cases:
   * - Product without variants becomes purchasable after this operation
   * - SKU uniqueness check includes soft-deleted variants
   * - Option values stored in separate table for 1NF compliance
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @SellerAuth()
    seller: SellerPayload,
    @TypedParam("productId")
    productId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IEcommerceMallProductVariant.ICreate,
  ): Promise<IEcommerceMallProductVariant> {
    try {
      return await postEcommerceMallSellerProductsProductIdVariants({
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
   * Update an existing product variant's information including SKU code, option values, and price override. This operation modifies the variant identified by the variant ID within the specified product, allowing sellers to update variant configuration details.
   *
   * The operation requires the seller to own the parent product. Only the product owner can modify their variants, ensuring data isolation and preventing unauthorized changes. Administrators can also perform this operation for oversight purposes.
   *
   * When updating, the system validates that the SKU code remains unique across all variants in the platform. If the SKU code changes, it checks against all existing variants to prevent duplicates. Option values must be provided as a structured combination of option names and values (e.g., {"color": "Red", "size": "Large"}). At least one option value is required.
   *
   * Price is optional and can override the product's base price. If null or omitted, the variant uses the product's base price from the parent product record. Price values must be non-negative.
   *
   * Stock quantity cannot be directly updated through this endpoint. Instead, inventory changes must be performed through the inventory management APIs, which create inventory records and automatically update the variant's stock quantity.
   *
   * Each variant update creates a snapshot in the product snapshots table, capturing the variant's state before and after the modification. This provides an audit trail for dispute resolution and historical tracking.
   *
   * Related operations: GET /products/{productId}/variants/{variantId} retrieves variant details, POST /products/{productId}/variants creates new variants, DELETE /products/{productId}/variants/{variantId} removes variants (with validation checks).
   *
   * @param connection
   * @param productId Parent product's unique identifier (global scope)
   * @param variantId Target variant's unique identifier (scoped to product)
   * @param body Variant update information including SKU code, option values, and price override
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Update product variant information with validation and snapshot creation. 1) Verify variant exists and belongs to specified product. 2) Validate seller owns the product (authorization check). 3) Check SKU code uniqueness across all variants if changed. 4) Validate optionValues are provided and non-empty. 5) Validate price is non-negative if provided. 6) Update variant fields (skuCode, price). 7) Update option values: delete existing option rows, insert new ones. 8) Create product snapshot capturing variant state before and after. 9) Return updated variant with current stock quantity calculated from inventory_records. Edge cases: reject if variant has active order items, reject if seller account suspended, reject if SKU duplicates existing variant.
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
    body: IEcommerceMallProductVariant.IUpdate,
  ): Promise<IEcommerceMallProductVariant> {
    try {
      return await putEcommerceMallSellerProductsProductIdVariantsVariantId({
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
   * Delete a specific product variant from a product catalog.
   *
   * This operation removes a product variant (SKU) from the system, making it unavailable for future purchases. The variant is soft-deleted to preserve historical order data and audit trails.
   *
   * **Deletion Validation Rules**:
   *
   * Before deletion, the system verifies that the variant has no active business relationships that would be disrupted:
   *
   * 1. No order items exist for this variant with 'paid' or 'shipped' status
   * 2. No pending cancellation requests exist for order items of this variant
   * 3. No pending refund requests exist for order items of this variant
   *
   * If any of these conditions are violated, the deletion request is rejected with a conflict error.
   *
   * **Deletion Process**:
   *
   * When deletion is approved, the system:
   *
   * 1. Creates a final snapshot of the variant state for audit purposes
   * 2. Sets the deleted_at timestamp to mark the variant as soft-deleted
   * 3. Removes the variant from search results and product listings
   * 4. Preserves all historical order items and inventory records for audit compliance
   *
   * **Access Control**:
   *
   * Only the product owner (seller) can delete their own variants. Administrators can delete any variant for policy violations. Customers cannot delete variants.
   *
   * **Related Operations**:
   *
   * - `GET /products/{productId}/variants/{variantId}` - Retrieve variant details before deletion
   * - `PATCH /products/{productId}/variants` - List all variants of a product
   * - `POST /products/{productId}/variants` - Create new variants
   * - `PUT /products/{productId}/variants/{variantId}` - Update variant information
   *
   * @param connection
   * @param productId Unique identifier of the product containing the variant (global scope)
   * @param variantId Unique identifier of the variant to delete (global scope)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor seller
   * @x-autobe-specification Delete variant implementation:
   *
   * 1. **Validation Phase**:
   *    - Verify productId exists and is accessible
   *    - Verify variantId exists and belongs to productId
   *    - Verify caller has ownership or admin privileges
   *
   * 2. **Business Rule Checks**:
   *    - Query order_items table for variant with status IN ('paid', 'shipped')
   *    - Query order_item_cancellation_requests for pending requests on variant's order items
   *    - Query order_item_refund_requests for pending requests on variant's order items
   *    - If any records found, return 409 Conflict with detailed violation information
   *
   * 3. **Deletion Execution**:
   *    - Create snapshot record capturing current variant state (before/after values)
   *    - Update variant.deleted_at to current timestamp
   *    - Variant becomes hidden from all search and listing queries
   *
   * 4. **Response**:
   *    - Return 204 No Content on successful deletion
   *    - Return 404 Not Found if variant or product doesn't exist
   *    - Return 403 Forbidden if caller lacks permissions
   *    - Return 409 Conflict if deletion blocked by business rules
   *
   * 5. **Edge Cases**:
   *    - Variant already deleted: return 404
   *    - Product deleted: return 404 (variant cascade deleted)
   *    - Variant with completed orders only: allow deletion
   *    - Variant with no order items: allow deletion
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
      return await deleteEcommerceMallSellerProductsProductIdVariantsVariantId({
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
