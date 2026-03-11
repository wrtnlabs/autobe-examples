import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardStatusEnumReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_status_enum_dependency_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Search with table/column name pattern
  const searchResult =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          search: "user",
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test 2: Filter by creation date range
  const dateFilterResult =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          created_after: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_before: new Date().toISOString(),
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  // Test 3: Pagination with specific page and limit
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(paginationResult);
  // Test 4: Combined filters
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          search: "article",
          created_after: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Test 5: Empty search results (non-existent pattern)
  const emptyResult =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent_table_pattern_xyz",
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search results should have zero records",
    emptyResult.pagination.records,
    0,
  );
  // Test pagination boundaries with realistic high page number
  const highPageResult =
    await api.functional.discussionBoard.superAdmin.status_enums.dependencies.index(
      superAdminConnection,
      {
        body: {
          page: 1000, // Realistic high page number
          limit: 10,
        } satisfies IDiscussionBoardStatusEnumReference.IRequest,
      },
    );
  typia.assert(highPageResult);
  TestValidator.predicate(
    "high page number should return empty data array",
    highPageResult.data.length === 0,
  );
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination metadata should be consistent",
    paginationResult.pagination.pages >= 0 &&
      paginationResult.pagination.current >= 0 &&
      paginationResult.pagination.limit >= 0 &&
      paginationResult.pagination.records >= 0,
  );
}
