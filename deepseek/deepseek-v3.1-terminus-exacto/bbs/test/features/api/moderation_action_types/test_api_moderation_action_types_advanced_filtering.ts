import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_action_types_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Filter by category and active status
  const categoryFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          category: "content",
          is_active: true,
          page: 1,
          limit: 20,
          sort: "name_asc",
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(categoryFilterResponse);
  // Validate category filtering
  if (categoryFilterResponse.data.length > 0) {
    for (const actionType of categoryFilterResponse.data) {
      TestValidator.equals(
        "category should be 'content' or null",
        actionType.category,
        "content",
        (key) => key !== "category",
      );
      TestValidator.predicate(
        "action type should be active",
        actionType.is_active,
      );
    }
  }
  // Test 2: Filter by severity level
  const severityFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          severity_level: "high",
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(severityFilterResponse);
  // Validate severity filtering
  if (severityFilterResponse.data.length > 0) {
    for (const actionType of severityFilterResponse.data) {
      TestValidator.equals(
        "severity should be 'high' or null",
        actionType.severity_level,
        "high",
        (key) => key !== "severity_level",
      );
    }
  }
  // Test 3: Text search filtering
  const searchFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          search: "warn",
          is_active: true,
          page: 1,
          limit: 15,
          sort: "name_desc",
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(searchFilterResponse);
  // Test 4: Combined filters
  const combinedFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          category: "content",
          severity_level: "medium",
          is_active: true,
          search: "remove",
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  // Validate combined filtering
  if (combinedFilterResponse.data.length > 0) {
    for (const actionType of combinedFilterResponse.data) {
      TestValidator.equals(
        "category should match filter",
        actionType.category,
        "content",
        (key) => key !== "category",
      );
      TestValidator.equals(
        "severity should match filter",
        actionType.severity_level,
        "medium",
        (key) => key !== "severity_level",
      );
      TestValidator.predicate(
        "action type should be active",
        actionType.is_active,
      );
    }
  }
  // Test 5: Edge case - non-existent category
  const nonExistentFilterResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          category: "non-existent-category",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(nonExistentFilterResponse);
  // Test 6: Pagination validation
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination data length should not exceed limit",
    paginationResponse.data.length <= 5,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    paginationResponse.pagination.pagination.pagination.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    paginationResponse.pagination.pagination.pagination.pagination.current ===
      1,
  );
  // Test 7: Sorting validation
  const sortedResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          sort: "name_asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // Validate alphabetical sorting (basic check)
  if (sortedResponse.data.length > 1) {
    const names = sortedResponse.data.map((item) => item.name);
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
    TestValidator.equals(
      "names should be sorted alphabetically",
      names,
      sortedNames,
    );
  }
}
