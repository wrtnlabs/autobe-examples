import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
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
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_item_retrieval_seller_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: ((typia.random<string & tags.Format<"email">>() as string) satisfies (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">)),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuthorized);
  // 2. Login customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuthorized.email,
        password: "Test1234!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(customerLogin);
  // 3. Register Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {
    body: {
      email: ((typia.random<string & tags.Format<"email">>() as string) satisfies (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">)),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAAuthorized);
  // 4. Register Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {
    body: {
      email: ((typia.random<string & tags.Format<"email">>() as string) satisfies (string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">)),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerBAuthorized);
  // 5. Customer creates cart
  const cart = await api.functional.ecommerceMall.customer.carts.create(
    customerLoginConnection,
  );
  typia.assert(cart);
  // 6. Add products from Seller A to cart (mock variant ID)
  const variantAId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.ecommerceMall.customer.carts.items.create(
    customerLoginConnection,
    {
      cartId: cart.id,
      body: {
        variant_id: variantAId,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 7. Add products from Seller B to cart (mock variant ID)
  const variantBId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.ecommerceMall.customer.carts.items.create(
    customerLoginConnection,
    {
      cartId: cart.id,
      body: {
        variant_id: variantBId,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 8. Retrieve existing orders from customer (multi-seller order already exists)
  const orderResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerLoginConnection,
      {
        body: {
          search: undefined,
          overallStatus: undefined,
          createdAtMin: undefined,
          createdAtMax: undefined,
          totalPriceMin: undefined,
          totalPriceMax: undefined,
          sortBy: undefined,
          sortOrder: undefined,
          cursor: undefined,
          limit: undefined,
          page: undefined,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderResponse);
  // Find the latest order (assuming multi-seller orders exist)
  const latestOrder = orderResponse.data[orderResponse.data.length - 1];
  typia.assert(latestOrder);
  // 9. Seller A creates shipment for their items
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerAAuthorized.email,
      password: "Test1234!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const shipmentA =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerALoginConnection,
      {
        body: {
          carrier_name: RandomGenerator.alphabets(5),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
          order_items: [],
        } satisfies IEcommerceMallShipment.ICreate,
        params: { orderId: latestOrder.id },
      },
    );
  typia.assert(shipmentA);
  // 10. Seller B creates shipment for their items
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerBAuthorized.email,
      password: "Test1234!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const shipmentB =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerBLoginConnection,
      {
        body: {
          carrier_name: RandomGenerator.alphabets(5),
          tracking_number: typia.random<string & tags.Format<"uuid">>(),
          order_items: [],
        } satisfies IEcommerceMallShipment.ICreate,
        params: { orderId: latestOrder.id },
      },
    );
  typia.assert(shipmentB);
  // 11. Get shipment item ID from shipmentA
  // shipmentA contains the full shipment with associated shipment items
  const shipmentItem = shipmentA.id;
  typia.assert(shipmentItem);
  const shipmentItemId = shipmentItem as string & tags.Format<"uuid">;
  // 12. Retrieve shipment item as Seller A
  const shipmentItemConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(shipmentItemConnection, {
    body: {
      email: sellerAAuthorized.email,
      password: "Test1234!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const retrievedShipmentItem =
    await api.functional.ecommerceMall.customer.orders.shipments.items.at(
      shipmentItemConnection,
      {
        orderId: latestOrder.id,
        shipmentId: shipmentA.id,
        shipmentItemId: shipmentItemId,
      },
    );
  typia.assert(retrievedShipmentItem);
  // 13. Validate shipment item details
  TestValidator.equals(
    "shipment item ID matches",
    retrievedShipmentItem.id,
    shipmentItemId,
  );
  TestValidator.equals(
    "carrier name matches",
    retrievedShipmentItem.shipment.carrierName,
    shipmentA.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipmentItem.shipment.trackingNumber,
    shipmentA.tracking_number,
  );
  TestValidator.equals(
    "shipment seller matches authenticated seller",
    retrievedShipmentItem.shipment.seller.id,
    sellerAAuthorized.id,
  );
  TestValidator.equals(
    "shipment order matches",
    retrievedShipmentItem.shipment.order.id,
    latestOrder.id,
  );
  TestValidator.equals(
    "order item status is shipped",
    retrievedShipmentItem.order_item.item_status,
    "shipped",
  );
  TestValidator.predicate(
    "order item quantity is positive",
    retrievedShipmentItem.order_item.quantity > 0,
  );
}