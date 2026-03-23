import { tags } from "typia";

import { IShoppingMallCheckoutReviewItem } from "./IShoppingMallCheckoutReviewItem";
import { IShoppingMallCheckoutShippingAddress } from "./IShoppingMallCheckoutShippingAddress";

export namespace IShoppingMallCheckoutReview {
  /**
   * Request body for reviewing order details before placement during the checkout process. The customer specifies which shipping address to use for the order. The system will validate that the address belongs to the customer, verify all cart items are still available with sufficient stock, and calculate the total order price based on current product pricing. This review step is required before the customer can proceed to place the actual order.
   */
  export type IRequest = {
    /**
     * UUID of the selected shipping address for this order. The customer chooses which saved address to use for delivery. The system validates that this address exists and belongs to the authenticated customer before proceeding with the checkout review.
     *
     * @x-autobe-specification UUID of the shipping address selected by the customer for this order. Validated against shopping_mall_addresses table: must exist, must not be soft-deleted, and must belong to the authenticated customer (address.customer_id equals customer_id from JWT token). If validation fails, return error with specific message about address not found or not belonging to customer.
     */
    addressId: string & tags.Format<"uuid">;

    /**
     * Target page number to retrieve (1-indexed). Specifies which page of cart items to display in the order review. Page numbering starts from 1. If omitted, null, or undefined, defaults to page 1 (first page). Requesting a page beyond the available range returns an empty items array with valid pagination metadata.
     *
     * @x-autobe-specification 1-indexed page number for paginating the cart items list in the review response. Defaults to 1 if not provided, null, or undefined. Controls which page of cart items to display in the order review summary. If page number exceeds available pages, returns empty items array with valid pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of cart items to return per page. Controls how many items are included in each page of the order review response. If omitted, null, or undefined, defaults to 100 items per page. The server may enforce upper bounds to prevent excessive resource consumption on large requests.
     *
     * @x-autobe-specification Maximum number of cart items to return per page in the review response. Defaults to 100 if not provided, null, or undefined. Controls how many cart items are included in each page of the order review. The server may enforce upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Complete order review summary returned before order placement during checkout.
   *
   * This response provides customers with a comprehensive view of their pending order, including all items in the shopping cart with full product details (name, description), variant specifications (SKU code, options like size/color), seller information (shop name), quantities, and pricing. Each item shows the unit price and line total (unit price × quantity).
   *
   * The shipping address is displayed in full, showing where the order will be delivered. This includes recipient name, phone number, street address, city, state/province, postal code, and country. Customers can verify the correct address is selected before proceeding to payment.
   *
   * Order totals are calculated and displayed: the total price (sum of all item line totals), total item count (sum of all quantities), and product count (number of distinct products). Prices reflect current database values at checkout time, which may differ from prices when items were added to the cart.
   *
   * This review is a prerequisite for order placement. If any validation fails (items deleted, out of stock, address invalid), the system returns an error instead of this summary.
   */
  export type ISummary = {
    /**
     * Array of order items to be purchased, including product details, variant specifications, seller information, quantities, and pricing for each item in the shopping cart.
     *
     * @x-autobe-specification Computed array of checkout review items. For each cart item in shopping_mall_cart_items, join with shopping_mall_products (name, description, base_price), shopping_mall_product_variants (sku_code, option_values, price_override), and shopping_mall_sellers (shop_name). Calculate item_price as variant.price_override if set, otherwise product.base_price. Calculate item_total as item_price × quantity. Each item includes product details, variant specifications, seller info, quantity, unit price, and line total.
     */
    items: IShoppingMallCheckoutReviewItem[] & tags.MinItems<1>;

    /**
     * Complete shipping address where the order will be delivered, including recipient name, phone number, street address, city, state/province, postal code, and country.
     *
     * @x-autobe-specification Computed address object from shopping_mall_addresses table. Query by address_id provided in request body. Verify address belongs to authenticated customer (customer_id matches JWT). Extract recipient_name, phone_number, street_address, city, state_province, postal_code, and country fields. Returns complete address details for delivery location verification.
     */
    shippingAddress: IShoppingMallCheckoutShippingAddress;

    /**
     * Total price of the order, calculated as the sum of all item line totals (unit price × quantity for each item).
     *
     * @x-autobe-specification Computed aggregate value. Calculate as SUM of all item_totals, where each item_total = item_price × quantity. item_price is variant.price_override if not null, otherwise product.base_price from shopping_mall_products. This represents the total order value before any taxes or shipping fees.
     */
    totalPrice: number;

    /**
     * Total number of items (units) in the order, calculated as the sum of quantities for all cart items.
     *
     * @x-autobe-specification Computed aggregate value. Calculate as SUM of all cart_item.quantity values from shopping_mall_cart_items. This represents the total number of individual items (units) in the order, not the number of distinct products.
     */
    itemCount: number & tags.Type<"int32"> & tags.Minimum<1>;

    /**
     * Number of distinct products in the order, representing unique product types regardless of quantity or variant selection.
     *
     * @x-autobe-specification Computed aggregate value. Calculate as COUNT of distinct product_ids from shopping_mall_cart_items. This represents the number of unique products in the order, regardless of quantity or variant.
     */
    productCount: number & tags.Type<"int32"> & tags.Minimum<1>;
  };
}
