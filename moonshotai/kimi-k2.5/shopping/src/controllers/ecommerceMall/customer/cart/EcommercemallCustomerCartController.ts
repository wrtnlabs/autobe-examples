import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IEcommerceMallCartItem } from "../../../../api/structures/IEcommerceMallCartItem";
import { IPageIEcommerceMallCartItem } from "../../../../api/structures/IPageIEcommerceMallCartItem";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { deleteEcommerceMallCustomerCartCartItemId } from "../../../../providers/deleteEcommerceMallCustomerCartCartItemId";
import { getEcommerceMallCustomerCartCartItemId } from "../../../../providers/getEcommerceMallCustomerCartCartItemId";
import { patchEcommerceMallCustomerCart } from "../../../../providers/patchEcommerceMallCustomerCart";
import { patchEcommerceMallCustomerCartValidate } from "../../../../providers/patchEcommerceMallCustomerCartValidate";
import { postEcommerceMallCustomerCart } from "../../../../providers/postEcommerceMallCustomerCart";
import { putEcommerceMallCustomerCartCartItemId } from "../../../../providers/putEcommerceMallCustomerCartCartItemId";

@Controller("/ecommerceMall/customer/cart")
export class EcommercemallCustomerCartController {
  /**
   * Add a product variant to the customer's shopping cart.
   *
   * This operation allows authenticated customers to add a specific product variant to their shopping cart. Unlike the wishlist which captures general product interest, the cart represents immediate purchase intent and requires selecting a specific variant with defined options such as color, size, or other configurations.
   *
   * When a customer adds an item to their cart, they must specify the exact product variant using its unique identifier and the desired quantity. The operation validates that the variant exists and is available for purchase. If the customer attempts to add the same variant that already exists in their cart, the quantities are automatically combined into a single line item rather than creating duplicate entries.
   *
   * The cart serves as a temporary holding area for purchase selections before checkout. Items remain in the cart until the customer proceeds to checkout, removes them, or their session expires. Cart contents are preserved across browsing sessions and are specific to each customer - they cannot be accessed or modified by other customers.
   *
   * Security Note: This endpoint requires customer authentication. Each customer can only add items to their own cart. The system enforces cart access boundaries to prevent cross-customer cart modifications.
   *
   * Related Operations:
   * - PATCH /cart - Lists all cart items with pagination and filtering
   * - PUT /cart/{cartItemId} - Updates quantity of an existing cart item
   * - DELETE /cart/{cartItemId} - Removes an item from the cart
   *
   * Error Scenarios:
   * - Returns 404 if the specified variant does not exist or has been deleted
   * - Returns 400 if the requested quantity exceeds available stock
   * - Returns 401 if the customer is not authenticated
   * - Returns 403 if attempting to modify another customer's cart
   *
   * @param connection
   * @param body Cart item creation information containing the selected variant and quantity
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification The e-commerce platform provides a shopping cart function for customers to temporarily hold intended purchases. Since this involves money being exchanged, purchase intent is considered a core business domain requiring data persistence.
   *
   * Implementation Requirements:
   * 1. Validate that the customer is authenticated - cart operations require the customer role
   * 2. Accept a request body containing product variant identifier and desired quantity
   * 3. Verify that the specified variant exists via ecommerce_mall_product_variants table join
   * 4. Check that the variant is still active and available for sale
   * 5. Query existing ecommerce_mall_cart_items to find if this customer already has the same variant in cart
   * 6. If existing cart item found: update the quantity field by adding the new quantity to existing quantity
   * 7. If no existing cart item: insert new record into ecommerce_mall_cart_items with customer_id, variant_id, and quantity
   * 8. Return the cart item record (either updated or newly created) with complete details including product and variant information
   *
   * Business Rules:
   * - Quantity must be a positive integer (at least 1)
   * - The variant must exist and not be marked as deleted by the seller
   * - Combined quantity should not exceed available inventory (optional validation - warn but allow)
   * - Cart items are scoped to the authenticated customer only
   * - Automatic merging prevents duplicate line items in the cart display
   *
   * Database Transaction:
   * - Use read committed isolation level
   * - If merging: SELECT existing cart item for update, then UPDATE quantity
   * - If creating: INSERT new cart item record
   * - Return the cart item with joined product and variant details for display
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallCartItem.ICreate,
  ): Promise<IEcommerceMallCartItem> {
    try {
      return await postEcommerceMallCustomerCart({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a paginated list of cart items for the authenticated customer.
   *
   * This operation returns all items currently in the customer's shopping cart, including product details, variant specifications, quantities, and pricing information. The cart serves as a temporary holding area for items the customer intends to purchase.
   *
   * Cart items display the product name, selected variant options (such as color and size), unit price, quantity, and line subtotal. The total price for all items in the cart is calculated and returned.
   *
   * The operation enforces strict data isolation by only returning cart items belonging to the authenticated customer. Access to other customers' cart items is blocked.
   *
   * Cart contents are preserved across browsing sessions until the customer proceeds to checkout, removes items, or their session expires. When checkout is initiated, the current cart state is used to generate the order summary.
   *
   * If a variant's stock is less than the cart quantity, a warning indicator is included in the response. Items from deleted or out-of-stock variants are marked as unavailable and cannot be checked out until resolved.
   *
   * The cart is preserved during payment failures, allowing customers to modify cart contents and retry payment. The system never clears the cart automatically based on payment processing failures.
   *
   * @param connection
   * @param body Search criteria and pagination parameters for cart items
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query ecommerce_mall_cart_items table joined with ecommerce_mall_product_variants and ecommerce_mall_products tables.
   *
   * Apply the following filters:
   * - Customer ID from authentication token (required)
   * - Soft delete check: deleted_at is null
   * - Exclude items where product_variant_id refers to a deleted variant
   * - Optional filter by product_id
   * - Optional filter by variant_id
   * - Optional filter by minimum quantity
   *
   * Join tables:
   * - ecommerce_mall_cart_items → ecommerce_mall_product_variants
   * - ecommerce_mall_product_variants → ecommerce_mall_products
   * - ecommerce_mall_products → ecommerce_mall_sellers
   * - ecommerce_mall_sellers → ecommerce_mall_seller_profiles
   *
   * Calculate stock status by checking:
   * - If variant exists and is not soft deleted
   * - If variant inventory (sum of inventory records) >= cart quantity
   * - If product exists and is not soft deleted
   *
   * Return paginated results with:
   * - Cart item details (id, quantity, created_at, updated_at)
   * - Variant details (id, sku_code, price, option values)
   * - Product details (id, name, description, base_price)
   * - Seller profile details (shop_name)
   * - Stock availability flag
   * - Line subtotal (quantity × variant price)
   *
   * Apply cursor-based pagination for large result sets.
   *
   * Authorization: customer only. Verify customer_id matches authenticated customer.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallCartItem.IRequest,
  ): Promise<IPageIEcommerceMallCartItem.ISummary> {
    try {
      return await patchEcommerceMallCustomerCart({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a specific cart item by its unique identifier.
   *
   * This endpoint returns detailed information about a single cart item that belongs to the authenticated customer. The cart item represents a specific product variant that the customer has added to their shopping cart with the intent to purchase. The response includes the cart item ID, quantity, product variant details, and associated timestamps.
   *
   * Security Considerations: This endpoint enforces strict access boundaries - customers can only retrieve cart items that belong to their own customer account. Attempts to access another customer's cart items will be rejected. This ensures data isolation between customers.
   *
   * Relationship to Underlying Data: The cart item links to the ecommerce_mall_cart_items table which stores the customer_id, product_variant_id, quantity, and temporal fields. The customer_id is automatically resolved from the authenticated session to enforce ownership validation. The table includes a deleted_at field for soft deletion; soft-deleted cart items will return 404.
   *
   * Related Operations: To view all cart items for the current customer, use the cart index endpoint. To modify quantities or remove items, use the cart update operations. To proceed to checkout, the cart items serve as the source of truth for order creation.
   *
   * @param connection
   * @param cartItemId Unique identifier of the cart item (global scope)
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Retrieve a single cart item by ID for the authenticated customer. Validate that the cart item belongs to the requesting customer by comparing customer_id with the authenticated user's customer ID. Join with ecommerce_mall_product_variants to include variant details (SKU code, options, price). Join with ecommerce_mall_products to include product name and main image for display purposes. Return 404 if the cart item does not exist or does not belong to the customer. Handle soft-deleted items gracefully by returning 404 rather than exposing deleted data.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cartItemId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string,
  ): Promise<IEcommerceMallCartItem> {
    try {
      return await getEcommerceMallCustomerCartCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the quantity of an existing item in the customer's shopping cart.
   *
   * This operation allows customers to modify the purchase quantity for a specific product variant that is already in their cart. The customer must be authenticated and can only update cart items belonging to their own account, as enforced by the cart access boundary rules.
   *
   * When the quantity is changed, the system validates that the new quantity is a positive integer. The update operation automatically refreshes the cart subtotal calculations and triggers stock availability validation.
   *
   * The cart item is identified by its unique cartItemId parameter in the URL path. The request body specifies the new quantity value. Upon successful update, the operation returns the complete updated cart item information including the new quantity, updated timestamps, and product variant details.
   *
   * This operation supports the quantity combination business rule - when the same variant is already present, quantities are combined rather than creating separate line items. Stock warnings are displayed when the requested quantity exceeds available inventory.
   *
   * @param connection
   * @param cartItemId Unique identifier of the cart item to update
   * @param body Cart item update payload containing the new quantity
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implement authentication check to ensure the requesting customer owns the cart item being updated. Retrieve the cart item by cartItemId and verify it belongs to the authenticated customer's account; reject with 403 Forbidden if ownership check fails.
   *
   * Validate the request body quantity field is a positive integer greater than zero. If quantity is zero or negative, reject with 422 Unprocessable Entity.
   *
   * Query the ecommerce_mall_cart_items table using the cartItemId UUID from path parameter. Check that deleted_at is NULL (item not already removed). Join with ecommerce_mall_product_variants to retrieve current stock level for validation warnings.
   *
   * Update the quantity field in the database record. Set updated_at to current timestamp. The created_at and deleted_at fields must remain unchanged.
   *
   * Return the complete updated cart item entity including: id, customer_id, product_variant_id, quantity, plus the joined product and variant information for display purposes.
   *
   * Handle edge cases: item not found (404), item soft-deleted (404), quantity exceeds available stock (return with warning flag), database constraint violations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":cartItemId")
  public async update(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string,
    @TypedBody()
    body: IEcommerceMallCartItem.IUpdate,
  ): Promise<IEcommerceMallCartItem> {
    try {
      return await putEcommerceMallCustomerCartCartItemId({
        customer,
        cartItemId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Soft deletes a specific item from the customer's shopping cart by marking it as removed.
   *
   * When a customer removes an item from their cart, the system performs a soft delete by setting the deleted_at timestamp on the cart item record. The actual data remains preserved in the database for reference purposes, but the item no longer appears in active cart listings.
   *
   * This operation requires customer authentication. The system enforces ownership validation to ensure customers can only delete cart items belonging to their own account. If a customer attempts to delete another customer's cart item, the request is rejected with a 403 Forbidden error.
   *
   * After soft deletion, the cart item will no longer be visible in the customer's active cart view and the cart total is recalculated to reflect only remaining items. The soft-deleted item can be identified by its non-null deleted_at timestamp.
   *
   * Related operations include viewing the cart (to see current active items), updating cart item quantities (as an alternative when customers want to adjust amounts rather than remove entirely), and the PATCH /ecommerceMall/customer/cart endpoint to list remaining cart items.
   *
   * @param connection
   * @param cartItemId Unique identifier of the cart item to delete
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Validate that the requesting customer is authenticated.
   *
   * Look up the cart item by cartItemId in the ecommerce_mall_cart_items table.
   *
   * Verify ownership: check that the cart item's customer_id matches the authenticated customer's ID. If not, return 403 Forbidden.
   *
   * If the cart item does not exist (or is already soft-deleted), return 404 Not Found.
   *
   * Permanently delete the cart item record from the database using soft delete (set deleted_at timestamp).
   *
   * Return the deleted cart item entity in the response for confirmation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":cartItemId")
  public async erase(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteEcommerceMallCustomerCartCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Validates the customer's shopping cart against current stock availability and product status.
   *
   * This operation performs comprehensive validation of all items in the customer's cart before checkout. It checks each cart item against real-time inventory records to verify stock availability, identifies deleted or discontinued variants that are no longer purchasable, and flags items where the requested quantity exceeds available stock.
   *
   * The validation process queries the current inventory state from ecommerce_mall_inventory_records for each variant in the cart. If a seller has deleted a variant (ecommerce_mall_product_variants status changes), the cart item is marked as unavailable. If stock quantity is less than the cart quantity, a warning is generated indicating the shortage amount.
   *
   * This operation is typically called when a customer initiates checkout or navigates to the cart page. If payment processing fails and the customer returns to the cart (see section 583), this validation should be re-run as stock levels may have changed.
   *
   * The response includes the complete cart state with availability flags, maximum allowed quantities, and warning messages for any issues that would prevent successful checkout. Items marked as unavailable cannot proceed to checkout and must be removed or the issue resolved before payment.
   *
   * @param connection
   * @param body Validation options specifying whether to automatically adjust quantities to available stock levels and which items to validate
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Query the customer's cart items from ecommerce_mall_cart_items table filtered by customerId from the authenticated session.
   *
   * For each cart item:
   * 1. Join with ecommerce_mall_product_variants to verify the variant still exists
   * 2. If variant is deleted, mark as unavailable with reason "variant_deleted"
   * 3. Calculate current stock by summing all inventory records in ecommerce_mall_inventory_records where variantId matches
   * 4. If current_stock <= 0, mark as unavailable with reason "out_of_stock"
   * 5. If cart quantity > current_stock, set warning flag with maxAllowedQuantity = current_stock
   * 6. Retrieve product info from ecommerce_mall_products and seller info from ecommerce_mall_sellers
   *
   * Return a structured response containing:
   * - Array of validated cart items with availability status
   * - Per-item warnings (if any)
   * - Overall cart validity flag (true only if all items available with sufficient quantity)
   * - Total price calculation for available items only
   *
   * Access Control:
   * - Must be authenticated as a customer
   * - Can only validate own cart (enforced by customerId = authenticated user's id)
   * - Unauthorized access attempts rejected (as per section 367)
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch("validate")
  public async validate(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallCartItem.IValidate,
  ): Promise<IEcommerceMallCartItem.IValidationResult> {
    try {
      return await patchEcommerceMallCustomerCartValidate({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
