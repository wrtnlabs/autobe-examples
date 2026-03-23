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
 * Test bulk unban operation with mixed success and failure scenarios.
 * Validates that the bulk unban endpoint correctly processes multiple customer IDs
 * with different states (banned, active, deleted, non-existent) and returns
 * appropriate success/failure categorization with detailed error reasons.
 */
export async function test_api_customer_bulk_unban_mixed_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin/login",
      referrer: "https://test.com/admin",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Create customer accounts
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1 = await authorize_customer_join(customer1Connection, {
    body: {
      email: "customer1@test.com",
      password: "1234",
      display_name: "Customer One",
      phone_number: "01012345678",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer1);
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2 = await authorize_customer_join(customer2Connection, {
    body: {
      email: "customer2@test.com",
      password: "1234",
      display_name: "Customer Two",
      phone_number: "01087654321",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer2);
  const customer3Connection: api.IConnection = { host: connection.host };
  const customer3 = await authorize_customer_join(customer3Connection, {
    body: {
      email: "customer3@test.com",
      password: "1234",
      display_name: "Customer Three",
      phone_number: "01011112222",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer3);
  const customer4Connection: api.IConnection = { host: connection.host };
  const customer4 = await authorize_customer_join(customer4Connection, {
    body: {
      email: "customer4@test.com",
      password: "1234",
      display_name: "Customer Four",
      phone_number: "01033334444",
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer4);
  // 3. Ban customers 1 and 2 (they should be successfully unbanned)
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customer1.id,
    body: { reason: "Policy violation" } satisfies IShoppingMallCustomer.IBan,
  });
  await api.functional.shoppingMall.admin.customers.ban(adminConnection, {
    customerId: customer2.id,
    body: {
      reason: "Terms of service breach",
    } satisfies IShoppingMallCustomer.IBan,
  });
  // 4. Delete customer 4 (should fail with 'customer already deleted')
  await api.functional.shoppingMall.admin.customers.erase(adminConnection, {
    customerId: customer4.id,
  });
  // 5. Generate a non-existent customer ID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Call bulk unban with mixed customer IDs
  const result =
    await api.functional.shoppingMall.admin.customers.bulk_unban.bulkUnban(
      adminConnection,
      {
        body: {
          customerIds: [
            customer1.id, // banned - should succeed
            customer2.id, // banned - should succeed
            customer3.id, // active - should fail (not banned)
            customer4.id, // deleted - should fail (already deleted)
            nonExistentId, // non-existent - should fail (not found)
          ],
        } satisfies IShoppingMallCustomerBulkUnban.ICreate,
      },
    );
  typia.assert(result);
  // 7. Validate response structure and content
  TestValidator.equals("success count", result.success.length, 2);
  TestValidator.equals("failed count", result.failed.length, 3);
  // Verify success array contains customer1 and customer2
  TestValidator.predicate(
    "customer1 in success",
    result.success.includes(customer1.id),
  );
  TestValidator.predicate(
    "customer2 in success",
    result.success.includes(customer2.id),
  );
  // Verify failed array has correct entries
  const failedCustomer3 = result.failed.find(
    (item) => item.customerId === customer3.id,
  );
  const failedCustomer4 = result.failed.find(
    (item) => item.customerId === customer4.id,
  );
  const failedNonExistent = result.failed.find(
    (item) => item.customerId === nonExistentId,
  );
  TestValidator.predicate(
    "customer3 failed item exists",
    failedCustomer3 !== undefined,
  );
  TestValidator.predicate(
    "customer4 failed item exists",
    failedCustomer4 !== undefined,
  );
  TestValidator.predicate(
    "non-existent customer failed item exists",
    failedNonExistent !== undefined,
  );
  // Verify error reasons
  if (failedCustomer3) {
    TestValidator.equals(
      "customer3 reason",
      failedCustomer3.reason,
      "customer not banned",
    );
  }
  if (failedCustomer4) {
    TestValidator.equals(
      "customer4 reason",
      failedCustomer4.reason,
      "customer already deleted",
    );
  }
  if (failedNonExistent) {
    TestValidator.equals(
      "non-existent reason",
      failedNonExistent.reason,
      "customer not found",
    );
  }
}
