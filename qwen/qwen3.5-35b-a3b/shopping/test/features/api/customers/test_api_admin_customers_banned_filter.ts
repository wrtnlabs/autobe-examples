import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/*
 * Test administrator's ability to filter customers by account ban status.
 *
 * Test Steps:
 * 1. Admin joins system via /ecommerceMall/auth/admin/join
 * 2. Admin calls /ecommerceMall/admin/customers with status filter set to true
 * 3. Validate response contains only customers where is_banned=true
 * 4. Admin calls /ecommerceMall/admin/customers with status filter set to false
 * 5. Validate response contains only customers where is_banned=false
 * 6. Admin calls /ecommerceMall/admin/customers without status filter
 * 7. Validate response includes customers regardless of ban status
 */
export async function test_api_admin_customers_banned_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Test status filter with status=true (banned customers only)
  const bannedFilterRequest = {
    status: true,
    limit: 100,
    page: 0,
  } satisfies IEcommerceMallCustomer.IRequest;
  const bannedCustomersResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: bannedFilterRequest,
    });
  typia.assert(bannedCustomersResult);
  // Validate all returned customers have is_banned=true
  for (const customer of bannedCustomersResult.data) {
    TestValidator.equals(
      `banned customer ${customer.id} should have is_banned=true`,
      customer.is_banned,
      true,
    );
  }
  // 3. Test status filter with status=false (active customers only)
  const activeFilterRequest = {
    status: false,
    limit: 100,
    page: 0,
  } satisfies IEcommerceMallCustomer.IRequest;
  const activeCustomersResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: activeFilterRequest,
    });
  typia.assert(activeCustomersResult);
  // Validate all returned customers have is_banned=false
  for (const customer of activeCustomersResult.data) {
    TestValidator.equals(
      `active customer ${customer.id} should have is_banned=false`,
      customer.is_banned,
      false,
    );
  }
  // 4. Test status filter with status=null (all customers)
  const allCustomersRequest = {
    limit: 100,
    page: 0,
  } satisfies IEcommerceMallCustomer.IRequest;
  const allCustomersResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: allCustomersRequest,
    });
  typia.assert(allCustomersResult);
  // Validate all customers have valid ban status (true or false)
  for (const customer of allCustomersResult.data) {
    TestValidator.predicate(
      `customer ${customer.id} has valid ban status`,
      customer.is_banned === true || customer.is_banned === false,
    );
  }
  // 5. Validate pagination metadata is correct for all queries
  TestValidator.equals(
    "banned customers pagination - current page",
    bannedCustomersResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "active customers pagination - current page",
    activeCustomersResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "all customers pagination - current page",
    allCustomersResult.pagination.current,
    1,
  );
  // 6. Validate no overlap between banned and active filtered results
  const bannedIds = new Set(bannedCustomersResult.data.map((c) => c.id));
  const activeIds = new Set(activeCustomersResult.data.map((c) => c.id));
  const overlap = bannedCustomersResult.data.filter((c) => activeIds.has(c.id));
  TestValidator.equals(
    "banned and active customers should not overlap",
    overlap.length,
    0,
  );
  // 7. Validate filtering creates proper separation
  const allIds = new Set(allCustomersResult.data.map((c) => c.id));
  const unionOfFilters = new Set([
    ...bannedCustomersResult.data.map((c) => c.id),
    ...activeCustomersResult.data.map((c) => c.id),
  ]);
  TestValidator.equals(
    "union of banned and active filters matches all customers",
    unionOfFilters.size,
    allIds.size,
  );
}
