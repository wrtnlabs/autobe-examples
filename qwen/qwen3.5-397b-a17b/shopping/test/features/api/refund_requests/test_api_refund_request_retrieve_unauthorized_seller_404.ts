import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShipmentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentLog";
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
import { generate_random_shopping_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_refund_requests_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_inventory_records_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a seller cannot access refund requests for order items they did not sell.
 *
 * This test validates the security boundary where sellers can only view refund requests
 * for their own order items. When an unauthorized seller attempts to retrieve a refund
 * request for another seller's order item, the system returns 404 Not Found (not 403)
 * to avoid revealing the existence of refund requests to unauthorized parties.
 *
 * Test flow:
 * 1. First seller (seller1) registers and creates a product with variant and inventory
 * 2. Second seller (seller2) registers and creates a separate product
 * 3. Customer registers and places an order with seller1's product
 * 4. Seller1 ships the order item
 * 5. Customer confirms delivery
 * 6. Customer submits refund request for seller1's order item
 * 7. Seller2 (unauthorized) attempts to retrieve seller1's refund request
 * 8. Validate: System returns 404 Not Found
 */
export async function test_api_refund_request_retrieve_unauthorized_seller_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller (refund request owner's counterparty)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. First seller creates product
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {},
  );
  typia.assert(product1);
  // 3. First seller creates product variant
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product1.id },
      },
    );
  typia.assert(variant1);
  // 4. First seller adds inventory stock for variant
  const inventory1 =
    await generate_random_shopping_mall_seller_inventory_records_create(
      seller1Connection,
      {
        body: {
          product_variant_id: variant1.id,
        },
      },
    );
  typia.assert(inventory1);
  // 5. Register second seller (unauthorized accessor)
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 6. Second seller creates separate product (to have valid seller account)
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {},
  );
  typia.assert(product2);
  // 7. Register customer to place orders
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 8. Customer creates order (system handles cart and address internally via generator)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get the order item - should exist from the order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 9. First seller ships the order item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    seller1Connection,
    {
      body: {
        order_item_ids: [orderItem.id],
      },
    },
  );
  typia.assert(shipment);
  // 10. Customer confirms delivery
  const confirmedShipment =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // 11. Customer submits refund request for the order item
  const refundRequest =
    await generate_random_shopping_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
      },
    );
  typia.assert(refundRequest);
  // 12. Second seller (unauthorized) attempts to retrieve first seller's refund request
  // Expected: 404 Not Found (security through obscurity - don't reveal existence)
  await TestValidator.error(
    "unauthorized seller should receive 404 when accessing another seller's refund request",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.at(
        seller2Connection,
        {
          refundRequestId: refundRequest.id,
        },
      );
    },
  );
}
