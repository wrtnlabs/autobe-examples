import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator list filtering by date range and soft-deleted status.
 *
 * This test validates:
 * 1. Date range filtering (from/to parameters) for created_at
 * 2. includeDeleted parameter visibility control
 * 3. Pagination metadata accuracy
 */
export async function test_api_administrator_list_date_and_deleted_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create multiple administrators at different times to test date range filtering
  const createdAdmins: IShoppingMallAdministrator.ISummary[] = [];
  const now = new Date();
  // Create 3 administrators
  for (let i = 0; i < 3; i++) {
    const tempConnection: api.IConnection = { host: connection.host };
    const newAdmin = await authorize_administrator_join(tempConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(newAdmin);
    createdAdmins.push({
      id: newAdmin.id,
      email: newAdmin.email,
      grade: newAdmin.grade,
      created_at: newAdmin.created_at,
      updated_at: newAdmin.updated_at,
    });
    // Small delay between creations to ensure different timestamps
    if (i < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  // 3. Test date range filtering - get administrators created in the last hour
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const dateRangeBody = {
    from: oneHourAgo.toISOString(),
    to: oneHourLater.toISOString(),
    limit: 100,
  } satisfies IShoppingMallAdministrator.IRequest;
  const dateRangeResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      { body: dateRangeBody },
    );
  typia.assert(dateRangeResult);
  // Validate that created admins are in the date range result
  const createdIds = createdAdmins.map((a) => a.id);
  const foundInDateRange = dateRangeResult.data.filter((a) =>
    createdIds.includes(a.id),
  );
  TestValidator.predicate(
    "created administrators found in date range query",
    foundInDateRange.length === createdAdmins.length,
  );
  // Validate that all returned records are within date range
  const fromDate = oneHourAgo.getTime();
  const toDate = oneHourLater.getTime();
  for (const admin of dateRangeResult.data) {
    const createdAt = new Date(admin.created_at).getTime();
    TestValidator.predicate(
      "created_at is within date range",
      createdAt >= fromDate && createdAt <= toDate,
    );
  }
  // 4. Test includeDeleted=false (default - only active accounts)
  const activeOnlyBody = {
    includeDeleted: false,
    limit: 100,
  } satisfies IShoppingMallAdministrator.IRequest;
  const activeOnlyResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      { body: activeOnlyBody },
    );
  typia.assert(activeOnlyResult);
  // 5. Test includeDeleted=true (include soft-deleted accounts)
  const includeDeletedBody = {
    includeDeleted: true,
    limit: 100,
  } satisfies IShoppingMallAdministrator.IRequest;
  const includeDeletedResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      { body: includeDeletedBody },
    );
  typia.assert(includeDeletedResult);
  // Validate that includeDeleted=true returns at least as many records as includeDeleted=false
  TestValidator.predicate(
    "includeDeleted=true has >= records than includeDeleted=false",
    includeDeletedResult.pagination.records >=
      activeOnlyResult.pagination.records,
  );
  // 6. Validate pagination metadata accuracy
  TestValidator.predicate(
    "pagination.current is valid",
    activeOnlyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    activeOnlyResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    activeOnlyResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    activeOnlyResult.pagination.pages >= 0,
  );
  // Validate pagination calculation
  const expectedPages = Math.ceil(
    activeOnlyResult.pagination.records / activeOnlyResult.pagination.limit,
  );
  TestValidator.equals(
    "pagination.pages calculated correctly",
    activeOnlyResult.pagination.pages,
    expectedPages,
  );
  // 7. Test combined filters - date range with includeDeleted
  const combinedBody = {
    from: oneHourAgo.toISOString(),
    to: oneHourLater.toISOString(),
    includeDeleted: true,
    limit: 100,
  } satisfies IShoppingMallAdministrator.IRequest;
  const combinedResult =
    await api.functional.shoppingMall.administrator.administrators.index(
      adminConnection,
      { body: combinedBody },
    );
  typia.assert(combinedResult);
  // Validate combined filtering works
  TestValidator.predicate(
    "combined filter returns results",
    combinedResult.data.length >= createdAdmins.length,
  );
}
