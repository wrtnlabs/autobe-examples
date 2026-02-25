import { HttpError, IConnection } from "@nestia/fetcher";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";

import { IPageIShoppingMallOrder } from "../../../../structures/IPageIShoppingMallOrder";
import { IShoppingMallOrder } from "../../../../structures/IShoppingMallOrder";

export * as items from "./items/index";
export * as address from "./address/index";

/**
 * Create a new order for the authenticated customer after successful payment processing.
 *
 * This operation finalizes the checkout process by creating a complete order record with all associated data. It should only be called after payment has been successfully processed through the external payment gateway. The system performs atomic operations to ensure data consistency.
 *
 * **Order Creation Process:**
 * 1. Validates that all cart items are available (not deleted, sufficient stock)
 * 2. Creates an order record with a unique order number (format: ORD-YYYY-NNNNNN)
 * 3. Creates order item records for each purchased variant with complete snapshot data including product name, description, category, thumbnail, variant SKU code and options, seller shop information, quantity, and unit price
 * 4. Creates an immutable shipping address snapshot from the customer's selected address
 * 5. Creates negative inventory records to decrease stock for each purchased variant
 * 6. Removes all purchased items from the customer's shopping cart
 * 7. Sets initial order status to 'paid' and all order item statuses to 'paid'
 *
 * **Snapshot Data Preservation:**
 * All order items preserve complete snapshot data at the time of purchase, ensuring historical accuracy even if products are edited, variants are modified, or seller profiles are changed. This enables accurate order history display and supports dispute resolution with verifiable purchase records.
 *
 * **Multi-Seller Orders:**
 * A single order can contain items from multiple sellers. Each order item references the seller who provided that product, enabling sellers to manage only their own items within multi-seller orders.
 *
 * **Business Rules:**
 * - Customer must be authenticated
 * - Selected address must belong to the customer
 * - All cart items must be available with sufficient stock
 * - Payment must have been successfully processed before calling this endpoint
 * - Order number is auto-generated and unique across the platform
 * - Orders cannot be deleted (preserved for legal compliance)
 *
 * **Related Operations:**
 * - GET /customers/me/cart - View cart contents before checkout
 * - POST /customers/me/checkout/prepare - Validate cart and prepare checkout
 * - GET /customers/me/orders - View order history
 * - GET /customers/me/orders/{id} - View order details
 *
 * @param props.connection
 * @param props.body Order creation details including selected shipping address
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Implement order creation as an atomic transaction with the following steps:
 *
 * 1. **Authentication & Authorization:**
 *    - Extract customer ID from JWT token
 *    - Verify customer account is active (not deleted, not banned)
 *
 * 2. **Input Validation:**
 *    - Validate addressId is provided and references an address owned by the customer
 *    - Validate the address exists and is not soft-deleted
 *
 * 3. **Cart Retrieval & Validation:**
 *    - Query shopping_mall_cart_items joined with shopping_mall_product_variants and shopping_mall_products
 *    - For each cart item:
 *      - Verify variant is not deleted
 *      - Verify product is not deleted
 *      - Verify variant stock >= cart item quantity
 *      - Verify variant is associated with an approved seller
 *    - If any item is unavailable, return 400 error with specific unavailable items
 *    - If cart is empty, return 400 error
 *
 * 4. **Order Number Generation:**
 *    - Generate unique order number in format: ORD-YYYY-NNNNNN
 *    - Use database sequence or atomic counter to ensure uniqueness
 *    - Example: ORD-2024-000001
 *
 * 5. **Calculate Total Price:**
 *    - Sum of (quantity * unit_price) for all cart items
 *    - Use variant price or product base price as unit price
 *
 * 6. **Database Transaction (atomic):**
 *    a. Create shopping_mall_orders record:
 *       - shopping_mall_customer_id = authenticated customer ID
 *       - order_number = generated order number
 *       - total_price = calculated total
 *       - status = 'paid'
 *       - created_at, updated_at = current timestamp
 *
 *    b. For each cart item, create shopping_mall_order_items record:
 *       - shopping_mall_order_id = new order ID
 *       - shopping_mall_seller_id = variant's product's seller ID
 *       - shopping_mall_product_id = product ID (may become null later)
 *       - shopping_mall_product_variant_id = variant ID (may become null later)
 *       - product_name = snapshot from product
 *       - product_description = snapshot from product
 *       - product_category_name = snapshot from product's category
 *       - product_base_price = snapshot from product
 *       - product_thumbnail_url = snapshot from product's first image
 *       - variant_sku_code = snapshot from variant
 *       - variant_price = snapshot from variant
 *       - seller_shop_name = snapshot from seller
 *       - seller_shop_description = snapshot from seller
 *       - seller_logo_url = snapshot from seller
 *       - quantity = from cart item
 *       - unit_price = from cart item
 *       - status = 'paid'
 *       - created_at = current timestamp
 *
 *    c. For each order item, create shopping_mall_order_item_variant_options records:
 *       - Copy option key-value pairs from the variant's options
 *
 *    d. Create shopping_mall_order_addresses record:
 *       - shopping_mall_order_id = new order ID
 *       - recipient_name, phone, street, city, state, postal_code, country = from selected address
 *       - created_at = current timestamp
 *
 *    e. For each cart item, create inventory history record:
 *       - Query or create shopping_mall_product_inventory_histories
 *       - Record negative quantity change
 *       - Reason: "Order placed - Order #[order number]"
 *
 *    f. Delete all cart items for this customer:
 *       - DELETE from shopping_mall_cart_items WHERE shopping_customer_id = customer ID
 *
 * 7. **Response Construction:**
 *    - Return complete order with nested order items and address
 *    - Include all snapshot data in order items
 *    - HTTP 201 Created with Location header
 *
 * **Error Handling:**
 * - 401 Unauthorized: Invalid or missing JWT token
 * - 400 Bad Request: Invalid address ID, empty cart, unavailable items
 * - 404 Not Found: Address not found
 * - 409 Conflict: Insufficient stock (race condition)
 * - 500 Internal Server Error: Transaction failure
 *
 * **Concurrency Considerations:**
 * - Use optimistic locking or SELECT FOR UPDATE on variants during stock check
 * - Handle race conditions where stock becomes insufficient between validation and commit
 * @path /shoppingMall/customer/orders
 * @accessor api.functional.shoppingMall.customer.orders.create
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
     * Order creation details including selected shipping address
     */
    body: IShoppingMallOrder.ICreate;
  };
  export type Body = IShoppingMallOrder.ICreate;
  export type Response = IShoppingMallOrder;

  export const METADATA = {
    method: "POST",
    path: "/shoppingMall/customer/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/orders";
  export const random = (): IShoppingMallOrder =>
    typia.random<IShoppingMallOrder>();
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
 * Retrieve a filtered and paginated list of orders for the authenticated customer.
 *
 * This operation allows customers to search and browse their order history with advanced filtering capabilities including status filtering, date range filtering, and order number search. Results are sorted by creation date in descending order (newest first) to help customers quickly find recent orders.
 *
 * **Order Status Values:**
 * - 'paid': All items are awaiting shipment
 * - 'shipped': At least one item is in transit
 * - 'delivered': All items have been delivered
 * - 'cancelled': All items were cancelled
 * - 'refunded': All items were refunded
 * - 'partially_completed': Items have mixed statuses
 *
 * **Response Structure:**
 * The response includes pagination information (current page, total pages, total count) and a data array of order summaries. Each order summary contains the order number (unique identifier like 'ORD-2024-001234'), creation timestamp, total price, and derived order status.
 *
 * **Authorization:**
 * This endpoint requires customer authentication. Only orders belonging to the authenticated customer are returned. The customer_id is automatically inferred from the JWT token - do not include it in the request body.
 *
 * @param props.connection
 * @param props.body Search criteria and pagination parameters for filtering orders. Customer ID is automatically inferred from authentication token.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor customer
 * @x-autobe-specification Query shopping_mall_orders table with pagination and filtering for the authenticated customer.
 *
 * **Implementation Steps:**
 * 1. Extract customer_id from JWT token in request headers
 * 2. Build Prisma query with WHERE clause filtering by shopping_mall_customer_id
 * 3. Apply optional filters:
 *    - status: Exact match on order status field
 *    - order_number: Partial match using contains (case-insensitive)
 *    - created_at_from: Greater than or equal comparison
 *    - created_at_to: Less than or equal comparison
 *    - total_price_min: Greater than or equal comparison
 *    - total_price_max: Less than or equal comparison
 * 4. Apply sorting: ORDER BY created_at DESC (newest first)
 * 5. Apply pagination using cursor-based or offset-based pagination
 * 6. Return IPageIShoppingMallOrder.ISummary structure with:
 *    - pagination: { current_page, total_pages, total_count, limit }
 *    - data: Array of order summaries
 *
 * **Database Query:**
 * ```prisma
 * const orders = await prisma.shopping_mall_orders.findMany({
 *   where: {
 *     shopping_mall_customer_id: customerId,
 *     // Additional filters from request body
 *   },
 *   orderBy: { created_at: 'desc' },
 *   skip: (page - 1) * limit,
 *   take: limit,
 * });
 * ```
 *
 * **Edge Cases:**
 * - If no orders found, return empty data array with pagination
 * - Validate date ranges: created_at_from should be <= created_at_to
 * - Validate price ranges: total_price_min should be <= total_price_max
 * - Default limit should be applied if not specified (e.g., 20)
 * @path /shoppingMall/customer/orders
 * @accessor api.functional.shoppingMall.customer.orders.index
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
     * Search criteria and pagination parameters for filtering orders. Customer ID is automatically inferred from authentication token.
     */
    body: IShoppingMallOrder.IRequest;
  };
  export type Body = IShoppingMallOrder.IRequest;
  export type Response = IPageIShoppingMallOrder.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/shoppingMall/customer/orders",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/customer/orders";
  export const random = (): IPageIShoppingMallOrder.ISummary =>
    typia.random<IPageIShoppingMallOrder.ISummary>();
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
