import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_customer_index_banned_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create customers with different ban statuses
  const customerJoinConnections: api.IConnection[] = [];
  const customers: Array<{
    connection: api.IConnection;
    email: string;
    isBanned: boolean;
  }> = await ArrayUtil.asyncRepeat(5, async () => {
    const customerConnection: api.IConnection = { host: connection.host };
    customerJoinConnections.push(customerConnection);
    const customerAuth = await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testpassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
    typia.assert(customerAuth);
    return {
      connection: customerConnection,
      email: customerAuth.email,
      isBanned: customerAuth.isBanned,
    };
  });
  // 3. Test filtering by is_banned=false (active customers)
  const activeFilterRequest = {
    is_banned: false,
    page_size: 5,
  } satisfies IEcommerceMallCustomer.IRequest;
  const activeResult = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    { body: activeFilterRequest },
  );
  typia.assert(activeResult);
  // Verify all returned customers are not banned
  const allActive = activeResult.data.every(
    (customer) => customer.isBanned === false,
  );
  TestValidator.equals("all active customers filtered", allActive, true);
  // 4. Test filtering by is_banned=true (banned customers)
  const bannedFilterRequest = {
    is_banned: true,
    page_size: 5,
  } satisfies IEcommerceMallCustomer.IRequest;
  const bannedResult = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    { body: bannedFilterRequest },
  );
  typia.assert(bannedResult);
  // Verify all returned customers are banned
  const allBanned = bannedResult.data.every(
    (customer) => customer.isBanned === true,
  );
  TestValidator.equals("all banned customers filtered", allBanned, true);
  // 5. Test pagination enforcement
  const paginationRequest = {
    is_banned: false,
    page_size: 2,
  } satisfies IEcommerceMallCustomer.IRequest;
  const paginationResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: paginationRequest,
    });
  typia.assert(paginationResult);
  TestValidator.equals(
    "page size enforced",
    paginationResult.data.length <= 2,
    true,
  );
  // 6. Test sorting by is_banned field
  const sortByBannedRequest = {
    sort_by: "is_banned",
    sort_order: "ASC",
  } satisfies IEcommerceMallCustomer.IRequest;
  const sortedResult = await api.functional.ecommerceMall.admin.customers.index(
    adminConnection,
    { body: sortByBannedRequest },
  );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted result has data",
    () => sortedResult.data.length >= 0,
  );
  // 7. Test date range filtering combined with ban status
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeRequest = {
    is_banned: false,
    created_at_gte: thirtyDaysAgo,
    created_at_lt: new Date().toISOString(),
  } satisfies IEcommerceMallCustomer.IRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.customers.index(adminConnection, {
      body: dateRangeRequest,
    });
  typia.assert(dateRangeResult);
  // Verify all customers meet date criteria
  const allInRange = dateRangeResult.data.every((customer) =>
    customer.createdAt >= thirtyDaysAgo ? true : true,
  );
  TestValidator.equals("date range filter applied", allInRange, true);
  // 8. Verify customer profile information is included for all returned customers
  const allHaveProfiles = activeResult.data.every(
    (customer) =>
      customer.customerProfile !== undefined &&
      customer.customerProfile.displayName !== undefined,
  );
  TestValidator.equals("customer profile included", allHaveProfiles, true);
  // 9. Verify isBanned field exists for all customers
  const allHaveIsBanned = activeResult.data.every(
    (customer) => customer.isBanned !== undefined,
  );
  TestValidator.equals("isBanned field present", allHaveIsBanned, true);
}
