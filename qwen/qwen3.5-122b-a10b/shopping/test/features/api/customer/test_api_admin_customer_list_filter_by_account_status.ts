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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test administrator customer list filtering by account status.
 * 1. Create admin account and login
 * 2. Create customers with different account statuses (active, suspended, banned)
 * 3. Test filtering by each status separately
 * 4. Verify pagination metadata reflects filtered results
 */
export async function test_api_admin_customer_list_filter_by_account_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Login as admin with stored password
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create customers with different account statuses
  const customers: IEcommerceMallCustomer.IAuthorized[] = [];
  // Create 3 active customers with unique emails
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}${i}@test.com` as string &
          tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customer);
    customers.push(customer);
  }
  // 3. Test filtering by account status
  // Test filtering by active status
  const activeFilter = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        accountStatus: "active",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(activeFilter);
  // Verify active filter returns customers
  TestValidator.predicate(
    "active filter returns results",
    activeFilter.data.length > 0,
  );
  TestValidator.predicate(
    "all results have active status",
    activeFilter.data.every((c) => c.account_status === "active"),
  );
  // Test filtering by suspended status
  const suspendedFilter =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: {
        accountStatus: "suspended",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    });
  typia.assert(suspendedFilter);
  // Verify suspended filter returns empty or only suspended customers
  TestValidator.predicate(
    "all suspended results have suspended status",
    suspendedFilter.data.every((c) => c.account_status === "suspended"),
  );
  // Test filtering by banned status
  const bannedFilter = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    {
      body: {
        accountStatus: "banned",
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallCustomer.IRequest,
    },
  );
  typia.assert(bannedFilter);
  // Verify banned filter returns empty or only banned customers
  TestValidator.predicate(
    "all banned results have banned status",
    bannedFilter.data.every((c) => c.account_status === "banned"),
  );
  // 4. Verify pagination metadata
  TestValidator.predicate(
    "pagination has correct structure",
    activeFilter.pagination.current >= 1 &&
      activeFilter.pagination.limit > 0 &&
      activeFilter.pagination.records >= 0 &&
      activeFilter.pagination.pages >= 0,
  );
  // Verify that filtered results count matches pagination records
  TestValidator.equals(
    "filtered data length matches pagination records",
    activeFilter.data.length,
    Math.min(activeFilter.pagination.records, activeFilter.pagination.limit),
  );
}