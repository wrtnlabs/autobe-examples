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
 * Test the primary success path of bulk banning multiple active customer accounts.
 * 1. Authenticate as administrator
 * 2. Create 3 active customer accounts with known passwords
 * 3. Bulk ban all 3 customers
 * 4. Verify ban operation success counts
 * 5. Verify each result item has status='success' and errorMessage=null
 * 6. Verify banned customers cannot login
 */
export async function test_api_customer_bulk_ban_success_multiple_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create 3 active customer accounts with known passwords
  const testPassword = "TestPassword123!";
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      password: testPassword,
    },
  });
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      password: testPassword,
    },
  });
  typia.assert(customer2);
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3 = await authorize_customer_join(customer3Connection, {
    body: {
      password: testPassword,
    },
  });
  typia.assert(customer3);
  // Verify all customers are initially active
  TestValidator.equals(
    "customer1 status is active",
    customer1.status,
    "active",
  );
  TestValidator.equals(
    "customer2 status is active",
    customer2.status,
    "active",
  );
  TestValidator.equals(
    "customer3 status is active",
    customer3.status,
    "active",
  );
  // 3. Bulk ban all 3 customers
  const banResult =
    await api.functional.shoppingMall.admin.customers.bulk_ban.bulkBan(
      adminConnection,
      {
        body: {
          customerIds: [customer1.id, customer2.id, customer3.id],
          reason: "Policy violation - bulk ban test",
        } satisfies IShoppingMallCustomerBulkBan.ICreate,
      },
    );
  typia.assert(banResult);
  // 4. Verify ban operation success counts
  TestValidator.equals("successCount is 3", banResult.successCount, 3);
  TestValidator.equals("failureCount is 0", banResult.failureCount, 0);
  TestValidator.equals("skippedCount is 0", banResult.skippedCount, 0);
  TestValidator.equals("results length is 3", banResult.results.length, 3);
  // 5. Verify each result item has status='success' and errorMessage=null
  const customer1Result = banResult.results.find(
    (r) => r.customerId === customer1.id,
  );
  const customer2Result = banResult.results.find(
    (r) => r.customerId === customer2.id,
  );
  const customer3Result = banResult.results.find(
    (r) => r.customerId === customer3.id,
  );
  typia.assertGuard(customer1Result!);
  typia.assertGuard(customer2Result!);
  typia.assertGuard(customer3Result!);
  TestValidator.equals(
    "customer1 ban status is success",
    customer1Result.status,
    "success",
  );
  TestValidator.equals(
    "customer1 errorMessage is null",
    customer1Result.errorMessage,
    null,
  );
  TestValidator.equals(
    "customer2 ban status is success",
    customer2Result.status,
    "success",
  );
  TestValidator.equals(
    "customer2 errorMessage is null",
    customer2Result.errorMessage,
    null,
  );
  TestValidator.equals(
    "customer3 ban status is success",
    customer3Result.status,
    "success",
  );
  TestValidator.equals(
    "customer3 errorMessage is null",
    customer3Result.errorMessage,
    null,
  );
  // 6. Verify banned customers cannot login
  await TestValidator.error("customer1 cannot login after ban", async () => {
    await authorize_customer_login(customer1Connection, {
      body: {
        email: customer1.email,
        password: testPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  await TestValidator.error("customer2 cannot login after ban", async () => {
    await authorize_customer_login(customer2Connection, {
      body: {
        email: customer2.email,
        password: testPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  await TestValidator.error("customer3 cannot login after ban", async () => {
    await authorize_customer_login(customer3Connection, {
      body: {
        email: customer3.email,
        password: testPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
}
