import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerBulkBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkBan";
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
import { prepare_random_shopping_mall_customer_bulk_ban } from "../../../prepare/prepare_random_shopping_mall_customer_bulk_ban";

/**
 * Test bulk ban operation with mixed scenarios including already-banned, active, and non-existent customers.
 * Verifies proper handling of different customer states and result order preservation.
 */
export async function test_api_customer_bulk_ban_mixed_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first customer account
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {});
  typia.assert(customer1);
  const customer1Id = customer1.id;
  // 3. Create second customer account
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {});
  typia.assert(customer2);
  const customer2Id = customer2.id;
  // 4. Pre-ban the first customer
  const bannedCustomer1 = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    {
      customerId: customer1Id,
      body: {
        reason: "Pre-banned for test scenario",
      } satisfies IShoppingMallCustomer.IBan,
    },
  );
  typia.assert(bannedCustomer1);
  TestValidator.equals(
    "customer1 status after ban",
    bannedCustomer1.status,
    "banned",
  );
  // 5. Generate a non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 6. Call bulk ban with mixed scenarios
  const bulkBanBody = {
    customerIds: [customer1Id, customer2Id, nonExistentId],
    reason: "Bulk ban test with mixed scenarios",
  } satisfies IShoppingMallCustomerBulkBan.ICreate;
  const result =
    await api.functional.shoppingMall.admin.customers.bulk_ban.bulkBan(
      adminConnection,
      { body: bulkBanBody },
    );
  typia.assert(result);
  // 7. Verify summary counts
  TestValidator.equals("success count", result.successCount, 1);
  TestValidator.equals("skipped count", result.skippedCount, 1);
  TestValidator.equals("failure count", result.failureCount, 1);
  // 8. Verify result items order and status
  TestValidator.equals("results array length", result.results.length, 3);
  // First item: already-banned customer (skipped)
  TestValidator.equals(
    "first result customerId",
    result.results[0].customerId,
    customer1Id,
  );
  TestValidator.equals(
    "first result status",
    result.results[0].status,
    "skipped",
  );
  TestValidator.equals(
    "first result errorMessage",
    result.results[0].errorMessage,
    null,
  );
  // Second item: active customer (success)
  TestValidator.equals(
    "second result customerId",
    result.results[1].customerId,
    customer2Id,
  );
  TestValidator.equals(
    "second result status",
    result.results[1].status,
    "success",
  );
  TestValidator.equals(
    "second result errorMessage",
    result.results[1].errorMessage,
    null,
  );
  // Third item: non-existent customer (failed)
  TestValidator.equals(
    "third result customerId",
    result.results[2].customerId,
    nonExistentId,
  );
  TestValidator.equals(
    "third result status",
    result.results[2].status,
    "failed",
  );
  TestValidator.predicate(
    "third result has error message",
    result.results[2].errorMessage !== null,
  );
  TestValidator.predicate(
    "error message contains 'not found'",
    result.results[2].errorMessage?.includes("not found") ?? false,
  );
}
