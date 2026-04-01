import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_order_items_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 2. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer setup - register and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 5. Customer creates order (this will create order item with 'paid' status)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  // Get the order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  // 6. Seller queries order items filtered by 'paid' status
  const paidItems = await api.functional.shoppingMall.seller.orders.items.index(
    sellerLoginConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(paidItems);
  // Validate paid items contain our order item
  TestValidator.predicate("paid items has data", paidItems.data.length > 0);
  const paidOrderItem = paidItems.data.find((item) => item.id === orderItem.id);
  TestValidator.predicate(
    "order item found in paid status",
    paidOrderItem !== undefined,
  );
  TestValidator.equals("paid order item status", paidOrderItem!.status, "paid");
  // 7. Seller creates shipment to change item status to 'shipped'
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        order_item_ids: [orderItem.id],
      },
    },
  );
  typia.assert(shipment);
  // 8. Seller queries order items filtered by 'shipped' status
  const shippedItems =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerLoginConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedItems);
  // Validate shipped items contain our order item
  TestValidator.predicate(
    "shipped items has data",
    shippedItems.data.length > 0,
  );
  const shippedOrderItem = shippedItems.data.find(
    (item) => item.id === orderItem.id,
  );
  TestValidator.predicate(
    "order item found in shipped status",
    shippedOrderItem !== undefined,
  );
  TestValidator.equals(
    "shipped order item status",
    shippedOrderItem!.status,
    "shipped",
  );
  // 9. Customer confirms delivery to change item status to 'delivered'
  const deliveryConfirmation =
    await api.functional.shoppingMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 10. Seller queries order items filtered by 'delivered' status
  const deliveredItems =
    await api.functional.shoppingMall.seller.orders.items.index(
      sellerLoginConnection,
      {
        body: {
          status: "delivered",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(deliveredItems);
  // Validate delivered items contain our order item
  TestValidator.predicate(
    "delivered items has data",
    deliveredItems.data.length > 0,
  );
  const deliveredOrderItem = deliveredItems.data.find(
    (item) => item.id === orderItem.id,
  );
  TestValidator.predicate(
    "order item found in delivered status",
    deliveredOrderItem !== undefined,
  );
  TestValidator.equals(
    "delivered order item status",
    deliveredOrderItem!.status,
    "delivered",
  );
  // 11. Validate pagination metadata across all status filters
  TestValidator.predicate(
    "paid pagination current page",
    paidItems.pagination.current >= 1,
  );
  TestValidator.predicate(
    "paid pagination records",
    paidItems.pagination.records >= 1,
  );
  TestValidator.predicate(
    "shipped pagination current page",
    shippedItems.pagination.current >= 1,
  );
  TestValidator.predicate(
    "delivered pagination current page",
    deliveredItems.pagination.current >= 1,
  );
}