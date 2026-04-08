import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ecommerce_mall_super_admin_admins_search_with_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // Test 1: Basic pagination without filters
  const basicRequest = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallAdmin.IRequest;
  const basicResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: basicRequest },
    );
  typia.assert(basicResult);
  // Test 2: Grade filter (regular)
  const regularGradeRequest = {
    page: 1,
    limit: 10,
    grade: "regular",
  } satisfies IEcommerceMallAdmin.IRequest;
  const regularGradeResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: regularGradeRequest },
    );
  typia.assert(regularGradeResult);
  // Test 3: Grade filter (super_admin)
  const superAdminGradeRequest = {
    page: 1,
    limit: 10,
    grade: "super_admin",
  } satisfies IEcommerceMallAdmin.IRequest;
  const superAdminGradeResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: superAdminGradeRequest },
    );
  typia.assert(superAdminGradeResult);
  // Test 4: Status filters - active
  const activeStatusRequest = {
    page: 1,
    limit: 5,
    status: "active",
  } satisfies IEcommerceMallAdmin.IRequest;
  const activeStatusResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: activeStatusRequest },
    );
  typia.assert(activeStatusResult);
  // Test 5: Status filters - suspended
  const suspendedStatusRequest = {
    page: 1,
    limit: 5,
    status: "suspended",
  } satisfies IEcommerceMallAdmin.IRequest;
  const suspendedStatusResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: suspendedStatusRequest },
    );
  typia.assert(suspendedStatusResult);
  // Test 6: Status filters - banned
  const bannedStatusRequest = {
    page: 1,
    limit: 5,
    status: "banned",
  } satisfies IEcommerceMallAdmin.IRequest;
  const bannedStatusResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: bannedStatusRequest },
    );
  typia.assert(bannedStatusResult);
  // Test 7: Search by nickname (partial matching with trigram index)
  const searchNicknameRequest = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(5),
  } satisfies IEcommerceMallAdmin.IRequest;
  const searchNicknameResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: searchNicknameRequest },
    );
  typia.assert(searchNicknameResult);
  // Test 8: Email search (partial matching)
  const searchEmailRequest = {
    page: 1,
    limit: 10,
    email: `${RandomGenerator.alphabets(4)}@`,
  } satisfies IEcommerceMallAdmin.IRequest;
  const searchEmailResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: searchEmailRequest },
    );
  typia.assert(searchEmailResult);
  // Test 9: Date range filter with inclusive boundaries
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeRequest = {
    page: 1,
    limit: 10,
    createdAtMin: thirtyDaysAgo.toISOString(),
    createdAtMax: now.toISOString(),
  } satisfies IEcommerceMallAdmin.IRequest;
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: dateRangeRequest },
    );
  typia.assert(dateRangeResult);
  // Test 10: Sorting by createdAt ascending
  const sortAscRequest = {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "asc",
  } satisfies IEcommerceMallAdmin.IRequest;
  const sortAscResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: sortAscRequest },
    );
  typia.assert(sortAscResult);
  // Test 11: Sorting by createdAt descending
  const sortDescRequest = {
    page: 1,
    limit: 10,
    sortBy: "createdAt",
    sortOrder: "desc",
  } satisfies IEcommerceMallAdmin.IRequest;
  const sortDescResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: sortDescRequest },
    );
  typia.assert(sortDescResult);
  // Test 12: Sorting by grade
  const sortGradeRequest = {
    page: 1,
    limit: 10,
    sortBy: "grade",
    sortOrder: "asc",
  } satisfies IEcommerceMallAdmin.IRequest;
  const sortGradeResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: sortGradeRequest },
    );
  typia.assert(sortGradeResult);
  // Test 13: Sorting by status
  const sortStatusRequest = {
    page: 1,
    limit: 10,
    sortBy: "status",
    sortOrder: "desc",
  } satisfies IEcommerceMallAdmin.IRequest;
  const sortStatusResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: sortStatusRequest },
    );
  typia.assert(sortStatusResult);
  // Test 14: Comprehensive combined filters with AND logic
  const comprehensiveRequest = {
    page: 1,
    limit: 20,
    grade: "regular",
    status: "active",
    search: RandomGenerator.alphabets(3),
    email: "@",
    sortBy: "createdAt",
    sortOrder: "desc",
  } satisfies IEcommerceMallAdmin.IRequest;
  const comprehensiveResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: comprehensiveRequest },
    );
  typia.assert(comprehensiveResult);
  // Validate pagination metadata is correctly populated
  TestValidator.equals(
    "pagination limit matches request limit",
    comprehensiveResult.pagination.limit,
    comprehensiveRequest.limit satisfies number as number,
  );
  TestValidator.equals(
    "pagination current page is valid",
    comprehensiveResult.pagination.current,
    comprehensiveRequest.page satisfies number as number,
  );
  // Test 15: includeDeleted flag for soft-deleted records
  const includeDeletedRequest = {
    page: 1,
    limit: 10,
    includeDeleted: true,
  } satisfies IEcommerceMallAdmin.IRequest;
  const includeDeletedResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: includeDeletedRequest },
    );
  typia.assert(includeDeletedResult);
  // Test 16: Cursor-based pagination support
  const cursorRequest = {
    limit: 5,
    cursor: null,
  } satisfies IEcommerceMallAdmin.IRequest;
  const cursorResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: cursorRequest },
    );
  typia.assert(cursorResult);
  // Test 17: Page 2 access with smaller limit
  const paginationRequest = {
    page: 2,
    limit: 5,
  } satisfies IEcommerceMallAdmin.IRequest;
  const paginationResult =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResult);
}
