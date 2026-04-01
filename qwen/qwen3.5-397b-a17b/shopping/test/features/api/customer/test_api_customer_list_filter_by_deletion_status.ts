import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test filtering customer accounts by deletion status.
 *
 * This test verifies that the super administrator can correctly filter customers
 * by their deletion status (active vs deleted). The test performs three separate
 * requests with different deleted filter values and validates that each returns
 * the correct subset of customers.
 *
 * Test Flow:
 * 1. Authenticate as super administrator
 * 2. Request customers with deleted=false (active only)
 * 3. Request customers with deleted=true (deleted only)
 * 4. Request customers with deleted=null (all customers)
 * 5. Validate each response contains correct customer subsets
 * 6. Verify pagination metadata reflects filtered counts
 */
export async function test_api_customer_list_filter_by_deletion_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdministrator.IJoin,
  });
  // 2. Request active customers only (deleted=false)
  const activeCustomersResponse =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          deleted: false,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(activeCustomersResponse);
  // 3. Request deleted customers only (deleted=true)
  const deletedCustomersResponse =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          deleted: true,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(deletedCustomersResponse);
  // 4. Request all customers (deleted=null)
  const allCustomersResponse =
    await api.functional.shoppingMall.superAdministrator.customers.index(
      superAdminConnection,
      {
        body: {
          deleted: null,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(allCustomersResponse);
  // 5. Validate active customers have null deleted_at
  for (const customer of activeCustomersResponse.data) {
    TestValidator.predicate(
      `active customer ${customer.id} should have null deleted_at`,
      customer.deleted_at === null,
    );
  }
  // 6. Validate deleted customers have non-null deleted_at
  for (const customer of deletedCustomersResponse.data) {
    TestValidator.predicate(
      `deleted customer ${customer.id} should have non-null deleted_at`,
      customer.deleted_at !== null,
    );
  }
  // 7. Validate pagination counts
  TestValidator.predicate(
    "active customers count should match pagination records",
    activeCustomersResponse.data.length ===
      activeCustomersResponse.pagination.records,
  );
  TestValidator.predicate(
    "deleted customers count should match pagination records",
    deletedCustomersResponse.data.length ===
      deletedCustomersResponse.pagination.records,
  );
  TestValidator.predicate(
    "all customers count should match pagination records",
    allCustomersResponse.data.length ===
      allCustomersResponse.pagination.records,
  );
  // 8. Validate that all customers count equals active + deleted
  TestValidator.equals(
    "total customers should equal active plus deleted",
    allCustomersResponse.pagination.records,
    activeCustomersResponse.pagination.records +
      deletedCustomersResponse.pagination.records,
  );
}
