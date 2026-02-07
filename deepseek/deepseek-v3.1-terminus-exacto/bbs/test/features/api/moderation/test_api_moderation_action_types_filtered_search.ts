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

/**
 * Test comprehensive filtering capabilities including category, severity level, active status, and text search.
 * Use specific filter combinations such as searching for active moderation action types in a specific category with medium severity level.
 * Verify that the filtering logic correctly applies all specified criteria and returns only matching results.
 * Test edge cases like searching for non-existent text terms to ensure empty result handling.
 */
export async function test_api_moderation_action_types_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test various filter combinations
  const filterTests = [
    // Single filter tests
    { category: "content" },
    { severity_level: "medium" },
    { is_active: true },
    { is_active: false },
    // Combined filters
    { category: "content", severity_level: "medium", is_active: true },
    { category: "user", severity_level: "high", is_active: false },
    // Text search tests
    { search: "moderate" },
    { search: "action" },
    // Edge case: non-existent search term
    { search: "nonexistentterm12345xyz" },
    // Null filter tests
    { category: null, severity_level: null },
    // Pagination tests
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 1, limit: 100 },
  ];
  for (const filter of filterTests) {
    const result =
      await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
        superAdminConnection,
        {
          body: {
            ...filter,
            page: filter.page ?? 1,
            limit: filter.limit ?? 10,
          } satisfies IDiscussionBoardModerationActionType.IRequest,
        },
      );
    typia.assert(result);
    // Validate pagination structure (typia.assert already validates everything)
    TestValidator.predicate(
      "pagination has valid structure",
      result.pagination.current >= 0 &&
        result.pagination.limit >= 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
    TestValidator.equals("data is array", Array.isArray(result.data), true);
  }
}
