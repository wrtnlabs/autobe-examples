import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSuperAdmin";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create first super admin account
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdmin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Wait a small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // Create second super admin account
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // Wait another small delay
  await new Promise((resolve) => setTimeout(resolve, 1100));
  // Create third super admin account
  const superAdmin3Connection: api.IConnection = { host: connection.host };
  const superAdmin3Auth = await authorize_super_admin_join(
    superAdmin3Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin3Auth);
  // Fetch the super admin list to get creation timestamps
  const listResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          sort: "created_at,asc",
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(listResult);
  // Get timestamps from the sorted list (oldest to newest)
  TestValidator.predicate(
    "at least 3 super admins exist",
    () => listResult.pagination.records >= 3,
  );
  // Sort by created_at to get chronological order
  const sortedAdmins = listResult.data.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstAdmin = sortedAdmins[0];
  const lastAdmin = sortedAdmins[sortedAdmins.length - 1];
  // Test 1: Filter with created_at_from - should return all super admins from first onwards
  const fromResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          created_at_from: firstAdmin.created_at,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(fromResult);
  TestValidator.predicate(
    "created_at_from filter returns at least 3 records",
    () => fromResult.pagination.records >= 3,
  );
  TestValidator.predicate("all results have created_at >= filter value", () =>
    fromResult.data.every(
      (admin) =>
        new Date(admin.created_at).getTime() >=
        new Date(firstAdmin.created_at).getTime(),
    ),
  );
  // Test 2: Filter with created_at_to - should return all super admins up to last
  const toResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          created_at_to: lastAdmin.created_at,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(toResult);
  TestValidator.predicate(
    "created_at_to filter returns at least 3 records",
    () => toResult.pagination.records >= 3,
  );
  TestValidator.predicate("all results have created_at <= filter value", () =>
    toResult.data.every(
      (admin) =>
        new Date(admin.created_at).getTime() <=
        new Date(lastAdmin.created_at).getTime(),
    ),
  );
  // Test 3: Combined date range filter - should return super admins within range
  const rangeResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          created_at_from: firstAdmin.created_at,
          created_at_to: lastAdmin.created_at,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(rangeResult);
  TestValidator.predicate(
    "combined date range filter returns at least 3 records",
    () => rangeResult.pagination.records >= 3,
  );
  TestValidator.predicate("all results are within date range", () =>
    rangeResult.data.every(
      (admin) =>
        new Date(admin.created_at).getTime() >=
          new Date(firstAdmin.created_at).getTime() &&
        new Date(admin.created_at).getTime() <=
          new Date(lastAdmin.created_at).getTime(),
    ),
  );
  // Test 4: Edge case - filter that matches no records (future date)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const noResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(noResult);
  TestValidator.equals(
    "future date filter returns empty data",
    noResult.data,
    [],
  );
  TestValidator.equals(
    "future date filter returns records=0",
    noResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date filter returns pages=0",
    noResult.pagination.pages,
    0,
  );
  // Test 5: Edge case - filter with past date that matches no records
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const pastResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          created_at_to: pastDate.toISOString(),
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(pastResult);
  TestValidator.equals(
    "past date filter returns empty data",
    pastResult.data,
    [],
  );
  TestValidator.equals(
    "past date filter returns records=0",
    pastResult.pagination.records,
    0,
  );
  // Test 6: Validate ISO 8601 datetime format in returned data
  const allResult =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      superAdmin3Connection,
      {
        body: {
          limit: 100,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(allResult);
  TestValidator.predicate(
    "all created_at values are valid ISO 8601 datetime",
    () =>
      allResult.data.every(
        (admin) => !isNaN(new Date(admin.created_at).getTime()),
      ),
  );
  TestValidator.predicate(
    "all updated_at values are valid ISO 8601 datetime",
    () =>
      allResult.data.every(
        (admin) => !isNaN(new Date(admin.updated_at).getTime()),
      ),
  );
}
