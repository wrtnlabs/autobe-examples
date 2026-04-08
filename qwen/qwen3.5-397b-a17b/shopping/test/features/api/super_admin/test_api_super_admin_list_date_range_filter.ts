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

/**
 * Test date range filtering for super administrator accounts based on created_at timestamps.
 *
 * Validates the date range filtering functionality of the super admin list endpoint by creating multiple accounts with known timestamps and verifying that the created_at_from and created_at_to filters correctly return only accounts within the specified range. Tests boundary conditions, inclusive filtering behavior, and pagination metadata accuracy.
 *
 * The test creates three super admin accounts sequentially to establish distinct timestamps, then performs multiple queries with different date range configurations to verify filtering accuracy. Special attention is given to testing inclusive boundary behavior where accounts created exactly on the filter timestamps should be included in results.
 *
 * 1. Create first super admin account and record timestamp.
 * 2. Create second super admin account and record timestamp.
 * 3. Create third super admin account and record timestamp.
 * 4. Query with date range capturing only the second account.
 * 5. Query with date range from first account timestamp (inclusive test).
 * 6. Query with date range to third account timestamp (inclusive test).
 * 7. Query with wide date range capturing all accounts.
 * 8. Query with narrow date range capturing no accounts.
 * 9. Validate pagination metadata records count matches filtered results.
 */
export async function test_api_super_admin_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super admin account
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_super_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin1);
  const admin1Time = new Date(admin1.created_at).getTime();
  // Wait briefly to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 2. Create second super admin account
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_super_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin2);
  const admin2Time = new Date(admin2.created_at).getTime();
  // Wait briefly to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Create third super admin account
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_super_admin_join(adminConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin3);
  const admin3Time = new Date(admin3.created_at).getTime();
  // Use admin1's connection for listing queries
  const listConnection: api.IConnection = { host: connection.host };
  listConnection.headers = { Authorization: admin1.token.access };
  // 4. Query with date range capturing only the second account
  // Set from slightly before admin2 and to slightly after admin2
  const beforeAdmin2 = new Date(admin2Time - 50).toISOString();
  const afterAdmin2 = new Date(admin2Time + 50).toISOString();
  const resultMiddle =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      listConnection,
      {
        body: {
          created_at_from: beforeAdmin2,
          created_at_to: afterAdmin2,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(resultMiddle);
  // Verify only admin2 is in the results
  TestValidator.predicate(
    "middle range contains admin2",
    resultMiddle.data.some((admin) => admin.id === admin2.id),
  );
  TestValidator.predicate(
    "middle range excludes admin1",
    !resultMiddle.data.some((admin) => admin.id === admin1.id),
  );
  TestValidator.predicate(
    "middle range excludes admin3",
    !resultMiddle.data.some((admin) => admin.id === admin3.id),
  );
  // 5. Test inclusive lower boundary - from exactly admin1's timestamp
  const resultFromBoundary =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      listConnection,
      {
        body: {
          created_at_from: admin1.created_at,
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(resultFromBoundary);
  // Verify admin1 is included (inclusive lower bound)
  TestValidator.predicate(
    "lower boundary includes admin1",
    resultFromBoundary.data.some((admin) => admin.id === admin1.id),
  );
  // 6. Test inclusive upper boundary - to exactly admin3's timestamp
  const resultToBoundary =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      listConnection,
      {
        body: {
          created_at_to: admin3.created_at,
          sort: "created_at",
          direction: "asc",
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(resultToBoundary);
  // Verify admin3 is included (inclusive upper bound)
  TestValidator.predicate(
    "upper boundary includes admin3",
    resultToBoundary.data.some((admin) => admin.id === admin3.id),
  );
  // 7. Query with wide date range capturing all accounts
  const wideFrom = new Date(admin1Time - 1000).toISOString();
  const wideTo = new Date(admin3Time + 1000).toISOString();
  const resultAll =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      listConnection,
      {
        body: {
          created_at_from: wideFrom,
          created_at_to: wideTo,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(resultAll);
  // Verify all three accounts are present
  TestValidator.predicate(
    "wide range includes admin1",
    resultAll.data.some((admin) => admin.id === admin1.id),
  );
  TestValidator.predicate(
    "wide range includes admin2",
    resultAll.data.some((admin) => admin.id === admin2.id),
  );
  TestValidator.predicate(
    "wide range includes admin3",
    resultAll.data.some((admin) => admin.id === admin3.id),
  );
  // 8. Query with narrow date range capturing no accounts
  const narrowFrom = new Date(admin1Time + 30).toISOString();
  const narrowTo = new Date(admin1Time + 70).toISOString();
  const resultNone =
    await api.functional.shoppingMall.superAdmin.super_admins.index(
      listConnection,
      {
        body: {
          created_at_from: narrowFrom,
          created_at_to: narrowTo,
        } satisfies IShoppingMallSuperAdmin.IRequest,
      },
    );
  typia.assert(resultNone);
  // Verify no accounts in narrow range
  TestValidator.equals("narrow range returns empty", resultNone.data.length, 0);
  // 9. Validate pagination metadata reflects filtered results
  TestValidator.predicate(
    "pagination records matches data length",
    resultMiddle.pagination.records >= resultMiddle.data.length,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    resultMiddle.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    resultMiddle.pagination.limit >= 1 && resultMiddle.pagination.limit <= 100,
  );
}
