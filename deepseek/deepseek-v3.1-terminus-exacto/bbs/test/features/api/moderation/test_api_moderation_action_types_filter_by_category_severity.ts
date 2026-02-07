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

export async function test_api_moderation_action_types_filter_by_category_severity(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // First, get all moderation action types to understand available categories and severity levels
  const allActionTypes =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(allActionTypes);
  // Extract available categories and severity levels from the response
  const availableCategories = Array.from(
    new Set(allActionTypes.data.map((item) => item.category).filter(Boolean)),
  );
  const availableSeverityLevels = Array.from(
    new Set(
      allActionTypes.data.map((item) => item.severity_level).filter(Boolean),
    ),
  );
  // If we have both categories and severity levels available, test combined filtering
  if (availableCategories.length > 0 && availableSeverityLevels.length > 0) {
    // Pick a random category and severity level combination
    const randomCategory = RandomGenerator.pick(availableCategories);
    const randomSeverity = RandomGenerator.pick(availableSeverityLevels);
    // Test combined filtering
    const filteredResponse =
      await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
        superAdminConnection,
        {
          body: {
            category: randomCategory,
            severity_level: randomSeverity,
            is_active: true,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardModerationActionType.IRequest,
        },
      );
    typia.assert(filteredResponse);
    // Validate that all returned records match the filter criteria
    for (const actionType of filteredResponse.data) {
      TestValidator.equals(
        "category matches filter",
        actionType.category,
        randomCategory,
      );
      TestValidator.equals(
        "severity level matches filter",
        actionType.severity_level,
        randomSeverity,
      );
      TestValidator.predicate(
        "action type is active",
        actionType.is_active === true,
      );
    }
    // Test pagination metadata reflects filtered subset
    TestValidator.predicate(
      "filtered pagination has valid structure",
      filteredResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      "filtered current page is 1",
      filteredResponse.pagination.current === 1,
    );
    TestValidator.predicate(
      "filtered limit is valid",
      filteredResponse.pagination.limit === 10,
    );
  }
  // Test null category filtering
  const nullCategoryResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          category: null,
          severity_level:
            availableSeverityLevels.length > 0
              ? RandomGenerator.pick(availableSeverityLevels)
              : undefined,
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(nullCategoryResponse);
  // Validate null category filter results
  for (const actionType of nullCategoryResponse.data) {
    if (actionType.category !== null && actionType.category !== undefined) {
      throw new Error(
        "Action type should have null category when filtered by null",
      );
    }
  }
  // Test null severity level filtering
  const nullSeverityResponse =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          category:
            availableCategories.length > 0
              ? RandomGenerator.pick(availableCategories)
              : undefined,
          severity_level: null,
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(nullSeverityResponse);
  // Validate null severity level filter results
  for (const actionType of nullSeverityResponse.data) {
    if (
      actionType.severity_level !== null &&
      actionType.severity_level !== undefined
    ) {
      throw new Error(
        "Action type should have null severity when filtered by null",
      );
    }
  }
}