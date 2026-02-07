import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_types_filter_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Define a specific category to filter by
  const targetCategory = "content";
  // Search for moderation action types filtered by category
  const result =
    await api.functional.discussionBoard.admin.moderation_action_types.index(
      adminConnection,
      {
        body: {
          category: targetCategory,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("current page is 1", result.pagination.current === 1);
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    result.pagination.pages >= 0,
  );
  // Validate that all returned action types match the specified category (if any exist)
  if (result.data.length > 0) {
    TestValidator.predicate(
      "all action types match category filter",
      result.data.every((actionType) => actionType.category === targetCategory),
    );
    // Validate response structure for each action type
    for (const actionType of result.data) {
      TestValidator.predicate(
        "has valid UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          actionType.id,
        ),
      );
      TestValidator.predicate("has non-empty code", actionType.code.length > 0);
      TestValidator.predicate("has non-empty name", actionType.name.length > 0);
      TestValidator.predicate(
        "has boolean is_active field",
        typeof actionType.is_active === "boolean",
      );
      TestValidator.predicate(
        "category matches filter",
        actionType.category === targetCategory,
      );
    }
  } else {
    // Validate that empty result set is valid
    TestValidator.predicate(
      "empty data array is valid",
      Array.isArray(result.data) && result.data.length === 0,
    );
  }
  // Test with a different category to ensure filtering works
  const alternativeCategory = "user";
  const alternativeResult =
    await api.functional.discussionBoard.admin.moderation_action_types.index(
      adminConnection,
      {
        body: {
          category: alternativeCategory,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(alternativeResult);
  // Validate that alternative category filtering also works
  if (alternativeResult.data.length > 0) {
    TestValidator.predicate(
      "alternative category filter works",
      alternativeResult.data.every(
        (actionType) => actionType.category === alternativeCategory,
      ),
    );
  }
}
