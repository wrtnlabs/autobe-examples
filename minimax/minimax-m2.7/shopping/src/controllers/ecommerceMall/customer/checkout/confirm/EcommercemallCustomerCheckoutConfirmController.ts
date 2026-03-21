import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia from "typia";

import { IEcommerceMallCheckoutConfirm } from "../../../../../api/structures/IEcommerceMallCheckoutConfirm";
import { IEcommerceMallOrder } from "../../../../../api/structures/IEcommerceMallOrder";
import { CustomerAuth } from "../../../../../decorators/CustomerAuth";
import { CustomerPayload } from "../../../../../decorators/payload/CustomerPayload";
import { postEcommerceMallCustomerCheckoutConfirm } from "../../../../../providers/postEcommerceMallCustomerCheckoutConfirm";

@Controller("/ecommerceMall/customer/checkout/confirm")
export class EcommercemallCustomerCheckoutConfirmController {
  /**
   * Confirm and place an order after successful payment processing.
   *
   * This endpoint is the final step in the checkout flow, creating a complete order record with all associated data. It must only be called after the external payment gateway has confirmed successful payment processing.
   *
   * The operation atomically creates the following records in a single database transaction:
   * - The main order record in ecommerce_mall_orders capturing the unique order_number, selected shipping address snapshot, and calculated totals
   * - Order item records in ecommerce_mall_order_items for each cart item, capturing product and variant references, quantities, and frozen unit prices
   * - Product snapshots in ecommerce_mall_product_snapshots preserving product state at purchase time for dispute resolution
   * - Seller profile snapshots in ecommerce_mall_seller_profile_snapshots preserving seller shop information at purchase time
   * - Inventory records in ecommerce_mall_inventory_records with negative quantity changes for each purchased variant
   * - Shipment records in ecommerce_mall_shipments for each seller, initialized with carrier and tracking_number as null pending seller shipment
   *
   * The customer must have a valid shopping cart with available items. All items in the cart are validated for availability including stock quantity and variant status before order creation proceeds.
   *
   * The shipping address must exist and belong to the authenticated customer. If no addressId is provided, the customer's default shipping address is used. If no default exists and no addressId is provided, the request fails.
   *
   * On successful order creation, all cart items are removed from the customer's cart as part of the same atomic transaction.
   *
   * Stock quantities for each purchased variant are decremented atomically. If any variant has insufficient stock, the entire order creation is rolled back and payment must be refunded.
   *
   * The order_number is auto-generated to be unique across all orders in the platform. The system retries generation if a collision occurs.
   *
   * Security: Only authenticated customers can access this endpoint. The customer must match the cart owner. Payment must be confirmed before calling this endpoint.
   *
   * @param connection
   * @param body Checkout confirmation request containing shipping address selection and payment token
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor customer
   * @x-autobe-specification 1. Extract authenticated customer from request context
   * 2. Validate customer has a shopping cart with items (ecommerce_mall_carts with ecommerce_mall_cart_items)
   * 3. For each cart item, validate:
   *    - Product variant exists and is not soft-deleted (ecommerce_mall_product_variants.deleted_at is null)
   *    - Product exists and is not soft-deleted (ecommerce_mall_products.deleted_at is null)
   *    - Current stock quantity >= requested quantity
   * 4. Validate shipping address:
   *    - If addressId provided: verify address exists, belongs to customer, and is not soft-deleted
   *    - If addressId not provided: use customer's default address (ecommerce_mall_shipping_addresses.is_default = true)
   *    - If no default address exists, return error
   * 5. Begin database transaction
   * 6. Generate unique order_number (retry on collision with @@unique constraint)
   * 7. Calculate subtotal: sum of (cart_item.quantity * variant.price or product.base_price)
   * 8. Calculate shipping_cost: per-seller flat rate or free shipping rules
   * 9. Create order record in ecommerce_mall_orders with status 'paid'
   * 10. For each cart item:
   *     a. Create product snapshot in ecommerce_mall_product_snapshots
   *     b. Create seller profile snapshot in ecommerce_mall_seller_profile_snapshots
   *     c. Create order item in ecommerce_mall_order_items with status 'paid', linking to snapshots
   *     d. Decrement variant quantity in ecommerce_mall_product_variants
   *     e. Create inventory record in ecommerce_mall_inventory_records with negative quantity_change
   * 11. Group order items by seller and create shipment records in ecommerce_mall_shipments for each seller
   * 12. Delete all cart items from ecommerce_mall_cart_items
   * 13. Commit transaction
   * 14. Return created order with order items and shipment summaries
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @CustomerAuth()
    customer: CustomerPayload,
    @TypedBody()
    body: IEcommerceMallCheckoutConfirm.IRequest,
  ): Promise<IEcommerceMallOrder> {
    try {
      return await postEcommerceMallCustomerCheckoutConfirm({
        customer,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
