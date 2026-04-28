import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallOrder } from "../../../../api/structures/IShoppingMallOrder";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { postShoppingMallCustomerCheckout } from "../../../../providers/postShoppingMallCustomerCheckout";
import { postShoppingMallCustomerCheckoutComplete } from "../../../../providers/postShoppingMallCustomerCheckoutComplete";

@Controller("/shoppingMall/customer/checkout")
export class ShoppingmallCustomerCheckoutController {
  /**
   * Create a new order from the authenticated customer's shopping cart.
   *
   * This operation initiates the checkout process by converting the customer's cart into a formal order. Before order creation, the system validates that all cart items are available for purchase (not marked as unavailable and have sufficient stock quantity). If any item fails validation, checkout is rejected with appropriate error messages.
   *
   * The customer selects a shipping address from their saved addresses by providing the addressId. The system captures all address fields (recipient name, phone number, street address, city, state/province, postal code, country) and stores them immutably on the order record, preserving the shipping destination exactly as it was at checkout time regardless of subsequent changes to the customer's address book.
   *
   * Upon successful validation, the system generates a unique order number, calculates the total price as the sum of (item price × quantity) for all items, creates order items from cart items with 'paid' status, decreases inventory for each purchased variant, removes the purchased items from the customer's cart, and stores the order with the captured shipping address.
   *
   * This operation requires customer authentication. Banned customers cannot place orders. Customers must have at least one saved address to complete checkout.
   *
   * @param connection
   * @param body Checkout details including the shipping address selection for order delivery
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implementation steps:
   *
   * 1. Authentication: Verify customer JWT token, extract customer ID, check banned status
   *
   * 2. Load cart: Query shopping_mall_carts where shopping_mall_customer_id = authenticated customer ID, join with shopping_mall_cart_items and shopping_mall_product_variants
   *
   * 3. Validate cart:
   *    - If cart is empty (no items), return error: 'Cannot checkout with empty cart'
   *    - For each cart item, check unavailable flag - if true, return error listing unavailable items
   *    - For each variant, query inventory_records and calculate current stock (SUM of quantity_change)
   *    - If stock < cart item quantity, return error for insufficient stock items
   *
   * 4. Validate address:
   *    - Query shopping_mall_addresses where id = request.addressId AND shopping_mall_customer_id = authenticated customer ID
   *    - If not found, return error: 'Invalid address selection'
   *    - If address.deleted_at is not null, return error: 'Address has been deleted'
   *
   * 5. Generate order number: Create unique identifier (e.g., timestamp-based or UUID-derived)
   *
   * 6. Calculate total price: SUM(cart_items.quantity × variants.price) for all items
   *
   * 7. Create order transaction:
   *    - INSERT into shopping_mall_orders with:
   *      - shopping_mall_customer_id = customer ID
   *      - order_number = generated unique value
   *      - total_price = calculated sum
   *      - status = 'paid' (awaiting payment processing)
   *      - shipping_recipient_name = address.recipient_name
   *      - shipping_phone_number = address.phone_number
   *      - shipping_street_address = address.street_address
   *      - shipping_city = address.city
   *      - shipping_state_province = address.state_province
   *      - shipping_postal_code = address.postal_code
   *      - shipping_country = address.country
   *      - created_at = current timestamp
   *      - updated_at = current timestamp
   *
   *    - For each cart item, INSERT into shopping_mall_order_items with:
   *      - shopping_mall_order_id = new order ID
   *      - shopping_mall_product_id = variant's product ID
   *      - shopping_mall_product_variant_id = cart item's variant ID
   *      - shopping_mall_seller_id = variant's product's seller ID
   *      - shopping_mall_shipment_id = null (not yet shipped)
   *      - quantity = cart item quantity
   *      - price = variant price (or product base price if no variant override)
   *      - status = 'paid'
   *      - created_at = current timestamp
   *      - updated_at = current timestamp
   *
   * 8. Return complete order with order items and shipping details
   *
   * Edge cases:
   * - Race condition: Use database transaction to ensure atomic creation
   * - Concurrent stock depletion: Re-validate stock within transaction before commit
   * - Deleted products: Include product/variant name in order item snapshot for historical accuracy
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallOrder.ICreate,
  ): Promise<IShoppingMallOrder> {
    try {
      return await postShoppingMallCustomerCheckout({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Finalizes the checkout process by converting the customer's shopping cart into a purchase order.
   *
   * This endpoint represents the final step in the checkout flow where the customer confirms their order with a selected shipping address. The system performs comprehensive validation including cart item availability, stock quantity verification, and payment processing through the external payment gateway.
   *
   * Upon successful completion, the operation creates an order record with the unique order_number, captures the shipping address as immutable fields, creates order items with associated snapshots for transaction integrity, decreases inventory stock quantities for each purchased variant, and removes all purchased items from the customer's cart.
   *
   * If payment fails, no order is created and the customer's cart remains intact for retry. If any cart items are unavailable or have insufficient stock, the checkout is rejected with appropriate error messages identifying the problematic items.
   *
   * This operation requires customer authentication. The shipping address cannot be modified after order creation. Orders are preserved even after customer account deletion for seller records and legal purposes.
   *
   * Related operations: GET /customers/cart retrieves cart contents before checkout, GET /customers/addresses lists available shipping addresses for selection.
   *
   * @param connection
   * @param body Checkout completion request with selected shipping address
     * @x-autobe-authorization-type null
     * @x-autobe-authorization-actor customer
     * @x-autobe-specification Implementation flow for checkout completion:
   *
   * 1. **Authentication & Authorization**: Extract customer from JWT session, reject if not authenticated.
   *
   * 2. **Address Validation**: Query shopping_mall_addresses table to verify the provided addressId exists, belongs to the authenticated customer, and is not soft-deleted (deleted_at IS NULL). Return 404 if address not found.
   *
   * 3. **Cart Retrieval**: Fetch customer's cart with all cart_items including related variant and product data through joins with shopping_mall_carts, shopping_mall_cart_items, shopping_mall_product_variants, and shopping_mall_products.
   *
   * 4. **Availability Check**: Verify each cart item's 'unavailable' flag is false. If any item has unavailable=true, return 400 with item identification.
   *
   * 5. **Stock Validation**: For each cart item, calculate current stock by summing shopping_mall_inventory_records.quantity_change for the variant. Compare against requested quantity. If insufficient, return 400 with specific item details showing product name, variant options, and stock deficit.
   *
   * 6. **Payment Processing**: Call external payment gateway API with total price. Handle gateway responses for success, failure, timeout. On failure, return 402 Payment Required without modifying cart or inventory.
   *
   * 7. **Order Creation Transaction** (within database transaction):
   *    - Generate unique order_number (format consideration: sequential or UUID-based)
   *    - Create shopping_mall_orders record with customer_id, order_number, total_price, derived status='paid', and shipping address fields copied from selected address
   *    - For each cart item, create shopping_mall_order_items record with order_id, product_id, variant_id, seller_id, quantity, price (from variant or product base_price), status='paid'
   *    - For each order item, create shopping_mall_order_item_snapshots with product_name, product_description, price, seller_shop_name, seller_logo_image
   *    - For each variant purchased, create negative shopping_mall_inventory_records entry with quantity_change = -quantity, order_id reference, reason='Order placed'
   *    - Delete shopping_mall_cart_items for purchased items (or clear entire cart if all items purchased)
   *
   * 8. **Response**: Return created order with order_number, total_price, status, shipping address details, and order items list.
   *
   * **Error Handling**:
   * - 400: Unavailable items or insufficient stock (identify specific items)
   * - 401: Unauthenticated
   * - 404: Address not found
   * - 402: Payment failed
   * - 500: Database transaction failure, payment gateway timeout
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("complete")
  public async complete(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IShoppingMallOrder.ICreate,
  ): Promise<IShoppingMallOrder> {
    try {
      return await postShoppingMallCustomerCheckoutComplete({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
