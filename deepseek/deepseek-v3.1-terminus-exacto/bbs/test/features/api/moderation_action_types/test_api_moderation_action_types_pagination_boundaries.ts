import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_action_types_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test minimum page size (1)
  const minLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "minimum limit is 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "current page is valid",
    minLimitResponse.pagination.current >= 1,
  );
  // Test maximum page size (100)
  const maxLimitResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "maximum limit is 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test page 0 (should default to page 1)
  const pageZeroResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          page: 0,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(pageZeroResponse);
  TestValidator.equals(
    "page 0 defaults to page 1",
    pageZeroResponse.pagination.current,
    1,
  );
  // Test page beyond total records (should return empty data)
  const largePageResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(largePageResponse);
  TestValidator.predicate(
    "large page returns empty data",
    largePageResponse.data.length === 0,
  );
  TestValidator.predicate(
    "total pages calculation",
    largePageResponse.pagination.pages >= 1,
  );
  // Test pagination metadata calculations
  const totalRecords = maxLimitResponse.pagination.records;
  const totalPages = maxLimitResponse.pagination.pages;
  TestValidator.predicate("total records is non-negative", totalRecords >= 0);
  TestValidator.predicate(
    "total pages calculation is correct",
    totalPages === Math.ceil(totalRecords / 100) ||
      (totalRecords === 0 && totalPages === 0),
  );
  // Test pagination with filtering (empty result set)
  const emptyFilterResponse =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          category: "non_existent_category",
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.predicate(
    "empty filter returns valid pagination",
    emptyFilterResponse.pagination.records >= 0,
  );
  // Test different page and limit combinations
  const combinations = [
    { page: 1, limit: 10 },
    { page: 2, limit: 25 },
    { page: 1, limit: 50 },
  ];
  for (const combo of combinations) {
    const response =
      await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
        superAdminConnection,
        {
          body: {
            page: combo.page,
            limit: combo.limit,
          } satisfies IDiscussionBoardModerationActionType.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      `page ${combo.page} is correct`,
      response.pagination.current,
      combo.page,
    );
    TestValidator.equals(
      `limit ${combo.limit} is correct`,
      response.pagination.limit,
      combo.limit,
    );
    TestValidator.predicate(
      `data length <= limit ${combo.limit}`,
      response.data.length <= combo.limit,
    );
  }
}
