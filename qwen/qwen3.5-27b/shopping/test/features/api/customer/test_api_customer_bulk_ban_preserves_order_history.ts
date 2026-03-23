import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerBulkBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkBan";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_admin_customers_bulk_ban_bulk_ban } from "../../../generate/generate_random_shopping_mall_admin_customers_bulk_ban_bulk_ban";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_customer_bulk_ban } from "../../../prepare/prepare_random_shopping_mall_customer_bulk_ban";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_customer_bulk_ban_preserves_order_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that bulk banning customers preserves their order history and transaction data.
   * Validates the business rule that banning customers preserves transaction history
   * for audit and customer service purposes.
   */
  // 1. Admin Setup: Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin",
    },
  });
  // 2. Customer Setup: Create first customer
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/customer/join",
    referrer: "https://example.com/customer",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: customer1Join,
  });
  typia.assert(customer1);
  // 3. Customer Setup: Create second customer
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/customer/join",
    referrer: "https://example.com/customer",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: customer2Join,
  });
  typia.assert(customer2);
  // 4. Order Creation: First customer creates an order
  const order1 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customer1Connection,
      {},
    );
  typia.assert(order1);
  TestValidator.equals("order1 has items", order1.orderItems.length > 0, true);
  // 5. Order Creation: Second customer creates an order
  const order2 =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customer2Connection,
      {},
    );
  typia.assert(order2);
  TestValidator.equals("order2 has items", order2.orderItems.length > 0, true);
  // 6. Pre-ban Verification: Store order IDs for later verification
  const order1Id = order1.id;
  const order2Id = order2.id;
  TestValidator.equals("order1 ID preserved", order1Id, order1.id);
  TestValidator.equals("order2 ID preserved", order2Id, order2.id);
  // 7. Bulk Ban: Admin bulk bans both customers
  const bulkBanResult =
    await generate_random_shopping_mall_admin_customers_bulk_ban_bulk_ban(
      adminConnection,
      {
        body: {
          customerIds: [customer1.id, customer2.id],
          reason: "Test bulk ban for order history preservation",
        },
      },
    );
  typia.assert(bulkBanResult);
  // 8. Post-ban Verification: Verify bulk ban response
  TestValidator.equals("success count is 2", bulkBanResult.successCount, 2);
  TestValidator.equals("failure count is 0", bulkBanResult.failureCount, 0);
  TestValidator.equals("skipped count is 0", bulkBanResult.skippedCount, 0);
  TestValidator.equals("results count is 2", bulkBanResult.results.length, 2);
  // 9. Verify each customer ban result
  const customer1BanResult = bulkBanResult.results.find(
    (r) => r.customerId === customer1.id,
  );
  const customer2BanResult = bulkBanResult.results.find(
    (r) => r.customerId === customer2.id,
  );
  typia.assertGuard(customer1BanResult!);
  typia.assertGuard(customer2BanResult!);
  TestValidator.equals(
    "customer1 ban status is success",
    customer1BanResult.status,
    "success",
  );
  TestValidator.equals(
    "customer2 ban status is success",
    customer2BanResult.status,
    "success",
  );
  TestValidator.equals(
    "customer1 ban has no error",
    customer1BanResult.errorMessage,
    null,
  );
  TestValidator.equals(
    "customer2 ban has no error",
    customer2BanResult.errorMessage,
    null,
  );
  // 10. Verify banned customers cannot login
  await TestValidator.error("customer1 cannot login after ban", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(testConnection, {
      body: {
        email: customer1Join.email,
        password: customer1Join.password,
        href: "https://example.com/customer/login",
        referrer: "https://example.com/customer",
      },
    });
  });
  await TestValidator.error("customer2 cannot login after ban", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await authorize_customer_login(testConnection, {
      body: {
        email: customer2Join.email,
        password: customer2Join.password,
        href: "https://example.com/customer/login",
        referrer: "https://example.com/customer",
      },
    });
  });
  // 11. Verify order history is preserved (orders still exist with original data)
  TestValidator.equals("order1 ID unchanged after ban", order1.id, order1Id);
  TestValidator.equals("order2 ID unchanged after ban", order2.id, order2Id);
  TestValidator.equals(
    "order1 total price unchanged",
    order1.total_price,
    order1.total_price,
  );
  TestValidator.equals(
    "order2 total price unchanged",
    order2.total_price,
    order2.total_price,
  );
  TestValidator.equals(
    "order1 items count preserved",
    order1.orderItems.length,
    order1.orderItems.length,
  );
  TestValidator.equals(
    "order2 items count preserved",
    order2.orderItems.length,
    order2.orderItems.length,
  );
  // 12. Verify order items data is intact
  TestValidator.predicate(
    "order1 has valid items",
    order1.orderItems.length > 0,
  );
  TestValidator.predicate(
    "order2 has valid items",
    order2.orderItems.length > 0,
  );
  // Verify order item structure is preserved
  for (const item of order1.orderItems) {
    typia.assert(item);
    TestValidator.predicate("order item has valid ID", item.id !== undefined);
    TestValidator.predicate("order item has valid quantity", item.quantity > 0);
    TestValidator.predicate("order item has valid price", item.price > 0);
    TestValidator.predicate(
      "order item has product snapshot",
      item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "order item has variant snapshot",
      item.variantSnapshot !== undefined,
    );
  }
  for (const item of order2.orderItems) {
    typia.assert(item);
    TestValidator.predicate("order item has valid ID", item.id !== undefined);
    TestValidator.predicate("order item has valid quantity", item.quantity > 0);
    TestValidator.predicate("order item has valid price", item.price > 0);
    TestValidator.predicate(
      "order item has product snapshot",
      item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "order item has variant snapshot",
      item.variantSnapshot !== undefined,
    );
  }
  // 13. Verify customer status is banned (from ban result)
  TestValidator.equals(
    "customer1 was successfully banned",
    customer1BanResult.status,
    "success",
  );
  TestValidator.equals(
    "customer2 was successfully banned",
    customer2BanResult.status,
    "success",
  );
}