import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test customer list status filtering functionality.
 *
 * This test validates that administrators can filter customers by account status
 * (active vs deleted) using the PATCH /shoppingMall/admin/customers endpoint.
 *
 * Test flow:
 * 1. Create admin account for authentication
 * 2. Test status='active' filter - should return only non-deleted customers
 * 3. Test status='deleted' filter - should return only soft-deleted customers
 * 4. Test default behavior (no status filter) - should exclude deleted accounts
 * 5. Verify pagination works correctly with status filters
 */
export async function test_api_customer_list_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Test status='active' filter - returns only non-deleted customers
  const activeFilterResult =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(activeFilterResult);
  TestValidator.predicate(
    "active filter returns valid pagination",
    () =>
      activeFilterResult.pagination.current >= 1 &&
      activeFilterResult.pagination.limit > 0 &&
      activeFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate("active customers have null deleted_at", () =>
    activeFilterResult.data.every((customer) => customer.deleted_at === null),
  );
  // 3. Test status='deleted' filter - returns only soft-deleted customers
  const deletedFilterResult =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        status: "deleted",
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(deletedFilterResult);
  TestValidator.predicate(
    "deleted filter returns valid pagination",
    () =>
      deletedFilterResult.pagination.current >= 1 &&
      deletedFilterResult.pagination.limit > 0 &&
      deletedFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate("deleted customers have populated deleted_at", () =>
    deletedFilterResult.data.every((customer) => customer.deleted_at !== null),
  );
  // 4. Test default behavior (no status filter) - should exclude deleted accounts
  const defaultResult = await api.functional.shoppingMall.admin.customers.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(defaultResult);
  TestValidator.predicate("default filter excludes deleted customers", () =>
    defaultResult.data.every((customer) => customer.deleted_at === null),
  );
  // 5. Verify pagination works with status filters
  const paginatedActiveResult =
    await api.functional.shoppingMall.admin.customers.index(adminConnection, {
      body: {
        status: "active",
        page: 2,
        limit: 10,
      } satisfies IShoppingMallCustomer.IRequest,
    });
  typia.assert(paginatedActiveResult);
  TestValidator.equals(
    "pagination current page",
    paginatedActiveResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedActiveResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    () => paginatedActiveResult.pagination.pages >= 0,
  );
}
