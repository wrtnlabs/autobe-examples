import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_customer_orders_items_refund_create } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller can view refund requests for their products with proper filtering and pagination.
 *
 * Validates the complete refund request viewing flow for sellers, including seller and customer registration, product creation with variants, order placement, shipment creation, delivery confirmation, and refund request creation. Ensures sellers can only view refund requests for their own products and that the response includes all required fields with correct data.
 *
 * Special attention is given to verifying that the seller field is null for pending requests (since the seller hasn't responded yet) and that the order item contains correct product variant, quantity, price, and status information.
 *
 * 1. Register and authenticate as a seller.
 * 2. Register and authenticate as a customer.
 * 3. Seller creates a product with variants and inventory.
 * 4. Customer adds product variant to cart and places order.
 * 5. Seller creates shipment for the order.
 * 6. Customer confirms delivery (item status becomes 'delivered').
 * 7. Customer creates a refund request for the delivered item.
 * 8. Seller calls PATCH /shoppingMall/seller/refund-requests with no filters.
 * 9. Verify response contains the refund request created in setup.
 * 10. Verify the request shows correct status ('pending'), reason, customer info, order item details.
 * 11. Verify seller field is null (since seller hasn't responded yet).
 * 12. Verify pagination metadata is correct.
 */
export async function test_api_refund_requests_seller_view_own_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 5. Customer adds product variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 6. Customer places order (checkout)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(order);
  // Extract the order item from the order
  const orderItem = order.items.find(
    (item) => item.productVariant.id === variant.id,
  );
  if (!orderItem) throw new Error("Order item not found for the variant");
  // 7. Seller creates shipment for the order
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        carrier_name: "FedEx",
        tracking_number: RandomGenerator.alphaNumeric(20),
        order_item_ids: [orderItem.id],
        order_id: order.id,
      },
    },
  );
  typia.assert(shipment);
  // 8. Customer confirms delivery
  await api.functional.shoppingMall.customer.orders.shipments.delivered.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );
  // 9. Customer creates a refund request for the delivered item
  const refundRequest =
    await generate_random_shopping_mall_customer_orders_items_refund_create(
      customerConnection,
      {
        params: {
          orderId: order.id,
          itemId: orderItem.id,
        },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 10. Seller views refund requests
  const refundRequestsPage =
    await api.functional.shoppingMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(refundRequestsPage);
  // 11. Verify pagination metadata
  TestValidator.equals(
    "pagination limit",
    refundRequestsPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination current page",
    refundRequestsPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has at least one record",
    refundRequestsPage.pagination.records >= 1,
  );
  // 12. Verify the refund request is in the response
  const foundRequest = refundRequestsPage.data.find(
    (req) => req.id === refundRequest.id,
  );
  if (!foundRequest)
    throw new Error("Refund request not found in seller's view");
  // 13. Verify the refund request details
  TestValidator.equals(
    "refund request id matches",
    foundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request status is pending",
    foundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "refund request reason matches",
    foundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "refund request has created_at",
    foundRequest.created_at !== undefined,
  );
  TestValidator.equals(
    "refund request responded_at is null",
    foundRequest.responded_at,
    null,
  );
  // 14. Verify customer information
  TestValidator.equals(
    "customer id matches",
    foundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    foundRequest.customer.email,
    customerAuth.email,
  );
  // 15. Verify seller field is null (since seller hasn't responded yet)
  TestValidator.equals(
    "seller field is null for pending request",
    foundRequest.seller,
    null,
  );
  // 16. Verify order item information
  TestValidator.equals(
    "order item id matches",
    foundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order item status is delivered",
    foundRequest.orderItem.status,
    "delivered",
  );
  TestValidator.equals(
    "order item quantity matches",
    foundRequest.orderItem.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "order item price matches",
    foundRequest.orderItem.price,
    orderItem.price,
  );
  TestValidator.equals(
    "order item product variant matches",
    foundRequest.orderItem.productVariant.id,
    variant.id,
  );
  // 17. Verify seller can only see their own refund requests
  TestValidator.predicate(
    "order item seller matches current seller",
    foundRequest.orderItem.seller.id === sellerAuth.id,
  );
}
