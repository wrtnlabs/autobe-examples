import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IShoppingMallCartItem } from "../../../../../api/structures/IShoppingMallCartItem";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { deleteShoppingMallCustomerCartItemsCartItemId } from "../../../../../providers/deleteShoppingMallCustomerCartItemsCartItemId";
import { getShoppingMallCustomerCartItemsCartItemId } from "../../../../../providers/getShoppingMallCustomerCartItemsCartItemId";
import { patchShoppingMallCustomerCartItems } from "../../../../../providers/patchShoppingMallCustomerCartItems";
import { postShoppingMallCustomerCartItems } from "../../../../../providers/postShoppingMallCustomerCartItems";
import { putShoppingMallCustomerCartItemsCartItemId } from "../../../../../providers/putShoppingMallCustomerCartItemsCartItemId";

@Controller("/shoppingMall/customer/cart/items")
export class ShoppingmallCustomerCartItemsController {
  /**
   * Add a product variant to the customer's shopping cart.
   *
   * This operation allows authenticated customers to add a specific product variant (SKU) to their cart with a specified quantity. The system validates that the variant is available (not deleted, has stock) and that the customer is not attempting to purchase their own products.
   *
   * **Quantity Merging**: When the same variant is added multiple times, the system automatically merges the quantities into a single cart item rather than creating duplicate entries. For example, if a customer adds 2 units of 'Red/Large' and then adds 3 more, the cart will show 5 units of that variant.
   *
   * **Validation Rules**:
   * - The variant must exist and not be soft-deleted by the seller
   * - The variant must have available stock (quantity > 0) - out-of-stock variants are rejected
   * - The seller must not be suspended or banned
   * - Customers cannot add their own products to cart (self-purchase prevention)
   * - The quantity must be a positive integer (minimum 1)
   *
   * **Stock Handling**:
   * Variants with zero stock cannot be added to cart and will result in a rejection error. The unavailable flag on cart items is used for items that become unavailable AFTER being added to cart (e.g., seller deletes the variant or stock depletes while item is in cart).
   *
   * **Cart Ownership**: Each customer has exactly one persistent cart. The cart is created automatically if it doesn't exist when the first item is added, and persists across sessions.
   *
   * @param connection
   * @param body Product variant to add with quantity
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation steps:
   *
   * 1. **Authentication & Cart Retrieval**:
   *    - Extract authenticated customer from JWT token
   *    - Find or create cart for the customer (one-to-one relationship with shopping_mall_customers)
   *
   * 2. **Variant Validation**:
   *    - Query shopping_mall_product_variants by variantId
   *    - Check if variant is soft-deleted (deleted_at IS NOT NULL) → reject with error
   *    - Calculate current stock by summing all inventory_records.quantity_change for this variant
   *    - If stock <= 0 → reject with 'out of stock' error
   *
   * 3. **Product & Seller Validation**:
   *    - Join shopping_mall_products to get product details
   *    - Join shopping_mall_sellers to check seller status
   *    - If seller.suspended = true OR seller.banned = true → reject with error
   *    - If seller.deleted_at IS NOT NULL → reject with error
   *
   * 4. **Self-Purchase Prevention**:
   *    - Check if authenticated customer also has a seller account (by email match)
   *    - If the seller of this product matches the customer's seller identity → reject with 'cannot purchase own products' error
   *
   * 5. **Cart Item Processing**:
   *    - Check if cart item already exists for this (cart_id, variant_id) combination
   *    - If exists: UPDATE quantity = existing_quantity + new_quantity, updated_at = NOW()
   *    - If not exists: INSERT new cart item with quantity, unavailable = false, created_at = NOW()
   *
   * 6. **Stock Warning (Non-blocking)**:
   *    - If total quantity in cart > current stock → set unavailable flag to true (but still allow add)
   *    - Note: This is for warning display, not blocking
   *
   * 7. **Response**:
   *    - Return the created/updated cart item with full details including variant, product, seller info
   *
   * **Database Queries**:
   * - SELECT variant with product and seller joins
   * - SELECT SUM(quantity_change) FROM inventory_records
   * - SELECT/INSERT/UPDATE cart_items with ON CONFLICT handling
   *
   * **Error Handling**:
   * - 401 Unauthorized if not authenticated
   * - 404 Not Found if variant doesn't exist
   * - 400 Bad Request with specific error messages for validation failures
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallCartItem.ICreate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await postShoppingMallCustomerCartItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the quantity of an existing cart item for the authenticated customer.
   *
   * This operation allows customers to modify the quantity of a product variant already in their shopping cart. The cart item is identified by the product variant ID, as each cart maintains exactly one item per variant combination.
   *
   * The customer must own the cart containing the item. The variant must exist and not be marked as unavailable in the cart. If the requested quantity exceeds the available stock, the update will succeed but include a stock warning in the response for customer awareness.
   *
   * After updating the quantity, the cart's total price is automatically recalculated using the current variant pricing at the time of the update.
   *
   * **Security and Ownership**:
   * - Only the customer who owns the cart can update its items
   * - The operation validates cart ownership before processing
   * - Unauthorized access attempts are logged and rejected
   *
   * **Related Operations**:
   * - POST /cart/items - Add a new item to cart
   * - DELETE /cart/items/{cartItemId} - Remove an item from cart
   * - GET /cart - View all cart contents
   *
   * **Business Rules**:
   * - Quantity must be at least 1
   * - Unavailable items (deleted variants or out of stock) cannot have quantity modified
   * - Stock warnings are advisory; checkout is blocked only for unavailable items
   * - Price is frozen at current variant pricing at time of modification
   *
   * @param connection
   * @param body Cart item update request containing the variant to update and the new quantity
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation steps:
   *
   * 1. **Authentication & Authorization**: Verify the authenticated user is a customer and retrieve their cart.
   *
   * 2. **Request Validation**:
   *    - Validate variant_id exists and is not soft-deleted
   *    - Validate quantity is a positive integer (minimum 1)
   *    - Check if the cart item exists (variant_id must be in customer's cart)
   *
   * 3. **Business Rule Validation**:
   *    - Verify cart item belongs to customer's cart (ownership check)
   *    - Check if item's 'unavailable' flag is true - if so, reject with error
   *    - Retrieve current stock for the variant (sum of inventory_records)
   *
   * 4. **Update Operation**:
   *    - Update cart_item.quantity to the new value
   *    - Update cart_item.updated_at timestamp
   *    - Update cart.updated_at timestamp
   *
   * 5. **Response Construction**:
   *    - Fetch product details (name, base_price)
   *    - Fetch variant details (option_values, price if override exists)
   *    - Calculate unit_price = variant.price ?? product.base_price
   *    - Calculate subtotal = unit_price * quantity
   *    - Determine if quantity exceeds available stock (stock_warning flag)
   *
   * 6. **Database Transaction**: All updates must be atomic within a single transaction.
   *
   * Edge Cases:
   * - If variant not found in cart, return 404
   * - If variant deleted globally, item's unavailable flag should already be true
   * - If customer sets quantity to 0, consider this as item removal (or reject with minimum 1)
   * - If seller suspended, variant can still be modified in cart but cannot checkout
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async patch(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallCartItem.IUpdate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await patchShoppingMallCustomerCartItems({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve detailed information about a specific cart item.
   *
   * This endpoint returns comprehensive details about a single cart item, including the selected product variant, product information, seller shop details, and current stock status. The response provides all information needed to display the cart item in the shopping cart interface.
   *
   * The shopping_mall_cart_items table stores individual items added to customer carts, each referencing a specific product variant with quantity and availability status. Each cart item belongs to exactly one cart, which belongs to one customer, ensuring data isolation between customers.
   *
   * The shopping_mall_product_variants table stores SKU configurations with unique option combinations (color, size, etc.) and optional price overrides. The variant's price field may override the product's base_price, and stock quantity is calculated by summing all associated shopping_mall_inventory_records.
   *
   * The shopping_mall_products table stores product catalog information including name, description, and category assignment. The shopping_mall_sellers table stores shop profile information including shop_name and logo_image that are displayed to customers.
   *
   * Authentication is required. The customer must own the cart containing the requested item. If the cart item does not exist or belongs to another customer's cart, a 404 Not Found response is returned to prevent cart enumeration attacks.
   *
   * The unavailable flag in the response indicates whether the variant has been deleted by the seller or is currently out of stock. Unavailable items cannot be checked out but remain visible in the cart for customer reference.
   *
   * @param connection
   * @param cartItemId Unique identifier of the cart item to retrieve. Must belong to the authenticated customer's cart.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Retrieve a single cart item by ID for the authenticated customer.
   *
   * **Authentication:** Requires customer authentication. Only the cart owner can access the item.
   *
   * **Authorization Flow:**
   * 1. Extract cartItemId from path parameters
   * 2. Query cart_item with variant, product, seller, and images relations
   * 3. Verify the cart_item's cart belongs to the authenticated customer
   * 4. If not owned, return 404 (not 403 to prevent enumeration)
   *
   * **Data Retrieval:**
   * 1. Join shopping_mall_cart_items with shopping_mall_product_variants
   * 2. Join with shopping_mall_products for product details
   * 3. Join with shopping_mall_sellers for shop information
   * 4. Join with shopping_mall_product_images for main thumbnail (lowest display_order)
   * 5. Calculate current stock from inventory records (sum of quantity_change)
   *
   * **Response Construction:**
   * - Cart item: id, quantity, unavailable, created_at, updated_at
   * - Variant: id, sku_code, option_values, price (or null for base price)
   * - Product: id, name, description, base_price
   * - Seller: id, shop_name, logo_image
   * - Main image: URL of image with lowest display_order
   * - Stock: calculated available quantity
   * - Price: variant.price if set, otherwise product.base_price
   * - Subtotal: price × quantity
   *
   * **Error Handling:**
   * - 401 Unauthorized: Not authenticated
   * - 404 Not Found: Cart item doesn't exist or doesn't belong to customer
   * - 500 Internal Error: Database or calculation errors
   *
   * **Caching:** Consider caching variant availability status with short TTL.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":cartItemId")
  public async at(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await getShoppingMallCustomerCartItemsCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update the quantity of an item in the customer's shopping cart.
   *
   * This operation allows customers to modify the quantity of a specific cart item. The quantity must be a positive integer (minimum 1). When updating quantity, the system checks stock availability and displays warnings if the requested quantity exceeds available stock.
   *
   * Cart ownership is strictly enforced - customers can only update items in their own cart. The operation updates both the cart item's quantity and the parent cart's last modified timestamp for session tracking purposes.
   *
   * If the associated product variant has been deleted by the seller or is out of stock, the item retains its unavailable status but quantity can still be adjusted. This preserves customer selections while preventing checkout of unavailable items.
   *
   * Related operations:
   * - POST /cart/items - Add new item to cart
   * - DELETE /cart/items/{cartItemId} - Remove item from cart
   * - GET /cart - View all cart items
   *
   * @param connection
   * @param cartItemId Unique identifier of the cart item to update (UUID format)
   * @param body Updated cart item quantity
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Update cart item quantity with ownership validation.
   *
   * 1. Retrieve cart item by ID from shopping_mall_cart_items table
   * 2. Verify the cart item belongs to the authenticated customer via cart relationship
   * 3. Validate quantity is positive integer (minimum 1)
   * 4. Check stock availability of the product variant against new quantity
   * 5. If quantity exceeds available stock, still allow update but mark warning
   * 6. Update cart_item.quantity and cart_item.updated_at
   * 7. Update parent cart.updated_at timestamp
   * 8. Return updated cart item with variant and product information
   *
   * Edge cases:
   * - If cart item not found: return 404
   * - If cart item doesn't belong to customer: return 403
   * - If variant is deleted/unavailable: item remains with unavailable=true
   * - Zero or negative quantity: reject with validation error
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":cartItemId")
  public async putByCartitemid(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedParam("cartItemId")
    cartItemId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IShoppingMallCartItem.IUpdate,
  ): Promise<IShoppingMallCartItem> {
    try {
      return await putShoppingMallCustomerCartItemsCartItemId({
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
   * Removes a specific item from the customer's shopping cart.
   *
   * This operation permanently deletes a cart item record from the shopping_mall_cart_items table. The item is identified by its unique UUID (cartItemId path parameter). Only the customer who owns the cart containing the item can perform this operation.
   *
   * When an item is removed, the cart's last modified timestamp (updated_at field in shopping_mall_carts) is automatically updated to reflect the change. The cart's total price and item count are implicitly recalculated since they are derived from the remaining items.
   *
   * This operation does NOT modify the stock quantity of the associated product variant. Stock quantities are only affected when orders are placed, cancelled, or refunded, as recorded in the inventory records table. This ensures that simply removing an item from a cart does not artificially inflate or deflate available inventory.
   *
   * No confirmation is required before removal. The operation is immediate and irreversible. If the same product variant is added to the cart again in the future, it will be treated as a new cart item with a fresh quantity.
   *
   * The cart itself is retained even if this deletion results in an empty cart, allowing the customer to continue shopping without creating a new cart session. Unavailable items (variants that were deleted by sellers or are out of stock) can also be removed through this endpoint.
   *
   * @param connection
   * @param cartItemId Unique identifier of the cart item to remove. This is the UUID primary key of the shopping_mall_cart_items record. The item must belong to the authenticated customer's cart.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation steps:
   *
   * 1. Authenticate the customer from the session token
   * 2. Find the cart item by cartItemId (UUID)
   * 3. Verify ownership: the cart item's cart must belong to the authenticated customer (cart → shopping_mall_customer_id must match current user)
   * 4. If item not found or unauthorized, return 404 Not Found or 403 Forbidden respectively
   * 5. Delete the cart item record from shopping_mall_cart_items table
   * 6. Update the parent cart's updated_at timestamp to current time
   * 7. Return 204 No Content or 200 OK with null body
   *
   * Business rules enforced:
   * - Only the cart owner can remove items
   * - Stock quantity is NOT modified (stock only changes on order/cancellation/refund)
   * - Cart is retained even if this was the last item
   * - No confirmation required before deletion
   * - The cart's last modified timestamp is updated
   *
   * Transaction: Use a transaction to ensure cart item deletion and cart timestamp update are atomic.
   *
   * Edge cases:
   * - If cartItemId does not exist: return 404
   * - If cart item belongs to another customer's cart: return 403
   * - If item is marked as unavailable: still allow removal
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
      return await deleteShoppingMallCustomerCartItemsCartItemId({
        customer,
        cartItemId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
