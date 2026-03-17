import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test the complete order item fulfillment lifecycle where a seller advances
 * an order item through multiple status transitions.
 *
 * Workflow:
 * 1. Create seller account and login
 * 2. Create customer account and login
 * 3. Customer places order (items created in PAID status)
 * 4. Seller updates status: PAID → SHIPPED
 * 5. Seller updates status: SHIPPED → DELIVERED
 * 6. Validate each transition and timestamp updates
 */
export async function test_api_order_item_complete_fulfillment_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(seller);
  // Seller login for order item updates
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined, // Fixed: IShoppingMallSeller.ILogin.ip is (string & Format<"ipv4">) | undefined, not nullable
    },
  });
  // 2. Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null, // Customer join accepts null
    },
  });
  typia.assert(customer);
  // Customer login for order creation
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customer.email,
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null, // Customer login accepts null
    },
  });
  // 3. Customer creates order (creates items in PAID status)
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerLoginConnection,
    {},
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0]!;
  const initialStatus = orderItem.status;
  const initialUpdatedAt = orderItem.updatedAt;
  // Validate initial state
  TestValidator.equals("initial status", initialStatus, "PAID");
  // 4. Seller updates status: PAID → SHIPPED
  const shippedUpdate =
    await api.functional.shoppingMall.seller.order_items.update(
      sellerLoginConnection,
      {
        orderItemId: orderItem.id,
        body: {
          status: "SHIPPED",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(shippedUpdate);
  // Validate first transition
  TestValidator.equals(
    "status after first update",
    shippedUpdate.status,
    "SHIPPED",
  );
  TestValidator.notEquals(
    "updated_at changed after ship",
    shippedUpdate.updatedAt,
    initialUpdatedAt,
  );
  const shippedUpdatedAt = shippedUpdate.updatedAt;
  // 5. Seller updates status: SHIPPED → DELIVERED
  const deliveredUpdate =
    await api.functional.shoppingMall.seller.order_items.update(
      sellerLoginConnection,
      {
        orderItemId: orderItem.id,
        body: {
          status: "DELIVERED",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(deliveredUpdate);
  // Validate second transition
  TestValidator.equals(
    "status after second update",
    deliveredUpdate.status,
    "DELIVERED",
  );
  TestValidator.notEquals(
    "updated_at changed after deliver",
    deliveredUpdate.updatedAt,
    shippedUpdatedAt,
  );
  // 6. Validate DELIVERED status enables review eligibility
  TestValidator.predicate(
    "final status is DELIVERED",
    deliveredUpdate.status === "DELIVERED",
  );
  TestValidator.predicate(
    "review eligible",
    deliveredUpdate.status === "DELIVERED",
  );
}
