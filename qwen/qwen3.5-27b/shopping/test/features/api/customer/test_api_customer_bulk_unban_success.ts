import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerBulkUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerBulkUnban";
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
import { generate_random_shopping_mall_admin_customers_bulk_unban_bulk_unban } from "../../../generate/generate_random_shopping_mall_admin_customers_bulk_unban_bulk_unban";
import { prepare_random_shopping_mall_customer_bulk_unban } from "../../../prepare/prepare_random_shopping_mall_customer_bulk_unban";

/**
 * Test bulk unban success scenario for multiple customer accounts.
 * Validates that administrators can restore access to multiple banned customers
 * in a single operation, and that unbanned customers can successfully log in.
 */
export async function test_api_customer_bulk_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create 3 customer accounts with known credentials
  const testPassword = "TestPassword123!";
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: customer1Email,
      password: testPassword,
    },
  });
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: customer2Email,
      password: testPassword,
    },
  });
  typia.assert(customer2);
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3Email = typia.random<string & tags.Format<"email">>();
  const customer3 = await authorize_customer_join(customer3Connection, {
    body: {
      email: customer3Email,
      password: testPassword,
    },
  });
  typia.assert(customer3);
  const customerIds = [customer1.id, customer2.id, customer3.id];
  // 3. Ban all 3 customers
  const banBody = {
    reason: "Test ban for bulk unban scenario",
  } satisfies IShoppingMallCustomer.IBan;
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customer1.id,
    body: banBody,
  });
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customer2.id,
    body: banBody,
  });
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customer3.id,
    body: banBody,
  });
  // 4. Call bulk unban endpoint
  const bulkUnbanBody = {
    customerIds: customerIds,
  } satisfies IShoppingMallCustomerBulkUnban.ICreate;
  const result =
    await api.functional.shoppingMall.admin.customers.bulk_unban.bulkUnban(
      adminConnection,
      { body: bulkUnbanBody },
    );
  typia.assert(result);
  // 5. Verify response - all customers should be in success array
  TestValidator.equals(
    "all customers unbanned successfully",
    result.success.length,
    3,
  );
  TestValidator.equals("no failed unbans", result.failed.length, 0);
  // Verify all customer IDs are in success array
  TestValidator.predicate(
    "customer1 ID in success",
    result.success.includes(customer1.id),
  );
  TestValidator.predicate(
    "customer2 ID in success",
    result.success.includes(customer2.id),
  );
  TestValidator.predicate(
    "customer3 ID in success",
    result.success.includes(customer3.id),
  );
  // 6. Verify customers can log in (status changed from banned to active)
  const customer1Login = await authorize_customer_login(customer1Connection, {
    body: {
      email: customer1Email,
      password: testPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customer1Login);
  TestValidator.equals(
    "customer1 status is active",
    customer1Login.status,
    "active",
  );
  const customer2Login = await authorize_customer_login(customer2Connection, {
    body: {
      email: customer2Email,
      password: testPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customer2Login);
  TestValidator.equals(
    "customer2 status is active",
    customer2Login.status,
    "active",
  );
  const customer3Login = await authorize_customer_login(customer3Connection, {
    body: {
      email: customer3Email,
      password: testPassword,
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customer3Login);
  TestValidator.equals(
    "customer3 status is active",
    customer3Login.status,
    "active",
  );
}
