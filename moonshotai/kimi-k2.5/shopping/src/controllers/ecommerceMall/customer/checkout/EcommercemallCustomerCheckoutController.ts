import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IEcommerceMallOrder } from "../../../../api/structures/IEcommerceMallOrder";
import { CustomerAuth } from "../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../decorators/payload/CustomerPayload";
import { postEcommerceMallCustomerCheckout } from "../../../../providers/postEcommerceMallCustomerCheckout";

@Controller("/ecommerceMall/customer/checkout")
export class EcommercemallCustomerCheckoutController {
  /**
   * Initiate checkout and create a new order from the customer's shopping cart.
   *
   * This endpoint processes the final stage of the checkout flow where the customer's cart contents are converted into a confirmed purchase. Before order creation, the system performs comprehensive validation: the cart must contain at least one item, all items must be available (variants not deleted by seller, sufficient stock exists to fulfill quantities), and the selected shipping address must be valid.
   *
   * The checkout process involves external payment gateway integration. If payment succeeds, the order is created atomically with the following side effects:
   * - An order header record is created with customer reference, unique order number, and shipping address captured from the selected address
   * - Order items are created for each cart item, preserving purchase-time pricing and linking to products, variants, and sellers
   * - Snapshots are captured of each product, variant, and seller profile to preserve the exact state at time of purchase for dispute resolution
   * - Inventory records with negative quantity_change are created for each purchased variant to deduct stock
   * - Cart items are removed from the customer's cart
   *
   * If payment fails or validation fails (empty cart, unavailable items, insufficient stock, invalid address), no order is created and the customer receives an error response with details.
   *
   * This endpoint is critical for the e-commerce platform's revenue capture and must ensure data consistency through atomic transactions. Related operations include: GET /cart to review cart contents before checkout, and PATCH /cart to modify quantities or remove unavailable items.
   *
   * @param connection
   * @param body Checkout initiation data including shipping address selection and payment information
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification Implementation requires the following sequence:
   *
   * 1. Authentication Check: Verify customer is authenticated via JWT session token.
   *
   * 2. Cart Validation:
   *    - Query ecommerce_mall_cart_items for current customer (excluding deleted_at items)
   *    - If no cart items found, return 400 error "Cart is empty"
   *    - Join with ecommerce_mall_product_variants to check availability
   *
   * 3. Item Availability Check:
   *    - For each cart item, verify variant.deleted_at is null
   *    - Calculate current stock by summing quantity_change from ecommerce_mall_inventory_records for each variant
   *    - If any variant stock < cart quantity, return 400 with list of unavailable items
   *    - Check seller is not suspended (via seller account status)
   *
   * 4. Address Validation:
   *    - Validate request body contains complete shipping address fields
   *    - Ensure recipient_name, recipient_phone, street_address, city, postal_code, country are present
   *
   * 5. External Payment Processing:
   *    - Prepare payment request with total_amount calculated from cart items
   *    - Call external payment gateway API
   *    - If payment fails, return 402 Payment Required with error details
   *
   * 6. Atomic Order Creation (transaction):
   *    - Generate unique order_number (timestamp + sequence format)
   *    - Create ecommerce_mall_orders record with customer_id, order_number, total_price (sum of variant price × quantity), status='paid', and address fields from request
   *    - For each cart item:
   *      a. Create ecommerce_mall_order_items with order_id, product_id, variant_id, seller_id, quantity, price_at_purchase (from variant price or product base_price), status='paid'
   *      b. Create ecommerce_mall_order_item_product_snapshots capturing product name, description, category_id at purchase time
   *      c. Create ecommerce_mall_order_item_variant_snapshots capturing SKU code, option values, price at purchase time
   *      d. Create ecommerce_mall_order_item_seller_snapshots capturing shop name at purchase time
   *      e. Create ecommerce_mall_inventory_records with negative quantity_change (deducting purchased quantity), reason='order_placed'
   *    - Delete all cart items for this customer from ecommerce_mall_cart_items
   *    - Commit transaction
   *    - Return created order with items and snapshots
   *
   * 7. Error Handling:
   *    - Rollback transaction on any failure
   *    - Return appropriate HTTP status codes and descriptive error messages
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallOrder.ICreate,
  ): Promise<IEcommerceMallOrder> {
    try {
      return await postEcommerceMallCustomerCheckout({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
