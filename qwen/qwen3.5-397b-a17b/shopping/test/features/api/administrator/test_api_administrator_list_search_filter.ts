import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_list_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. List all administrators without filters to get baseline
  const allAdmins = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(allAdmins);
  TestValidator.predicate(
    "pagination valid",
    allAdmins.pagination.records >= 0,
  );
  // 3. Test email partial match search
  const searchEmail = "admin";
  const emailSearchResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: searchEmail,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(emailSearchResult);
  // Verify all returned admins contain the search term in email
  emailSearchResult.data.forEach((admin) => {
    TestValidator.predicate(
      `email contains "${searchEmail}"`,
      admin.email.toLowerCase().includes(searchEmail.toLowerCase()),
    );
  });
  // 4. Test date range filtering with created_at_from
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromDateFilter =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          created_at_from: sevenDaysAgo.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(fromDateFilter);
  // Verify all returned admins were created on or after the from date
  fromDateFilter.data.forEach((admin) => {
    TestValidator.predicate(
      "created_at >= from date",
      new Date(admin.created_at).getTime() >= sevenDaysAgo.getTime(),
    );
  });
  // 5. Test date range filtering with created_at_to
  const toDateFilter =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(toDateFilter);
  // Verify all returned admins were created on or before the to date
  toDateFilter.data.forEach((admin) => {
    TestValidator.predicate(
      "created_at <= to date",
      new Date(admin.created_at).getTime() <= now.getTime(),
    );
  });
  // 6. Test combined filters (email + date range)
  const combinedFilter =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          search: searchEmail,
          created_at_from: sevenDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Verify all returned admins match both criteria
  combinedFilter.data.forEach((admin) => {
    TestValidator.predicate(
      `email contains "${searchEmail}"`,
      admin.email.toLowerCase().includes(searchEmail.toLowerCase()),
    );
    TestValidator.predicate(
      "created_at within date range",
      new Date(admin.created_at).getTime() >= sevenDaysAgo.getTime() &&
        new Date(admin.created_at).getTime() <= now.getTime(),
    );
  });
  // 7. Test empty results with non-matching search term
  const uniqueSearchTerm = RandomGenerator.alphaNumeric(32);
  const emptyResult = await api.functional.shoppingMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        search: uniqueSearchTerm,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty result structure
  TestValidator.equals("empty data array", emptyResult.data, []);
  TestValidator.equals("records count", emptyResult.pagination.records, 0);
  TestValidator.equals("pages count", emptyResult.pagination.pages, 0);
  TestValidator.equals("current page", emptyResult.pagination.current, 1);
}
