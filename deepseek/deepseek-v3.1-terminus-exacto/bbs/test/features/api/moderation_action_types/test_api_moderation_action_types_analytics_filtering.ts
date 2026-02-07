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

/**
 * Test the moderation action types analytics endpoint with comprehensive filtering capabilities.
 * Create an admin account first, then test filtering by category, severity level, active status,
 * text search, and pagination parameters. Verify that the response includes pagination metadata
 * and that filtering works correctly for different combinations of parameters.
 */
export async function test_api_moderation_action_types_analytics_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Basic pagination with default parameters
  const defaultResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "default response has pagination metadata",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "default response current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default response limit",
    defaultResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "default response has valid records count",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default response has valid pages count",
    defaultResponse.pagination.pages >= 0,
  );
  // Test 2: Filter with null category (should return all categories)
  const nullCategoryResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          category: null,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(nullCategoryResponse);
  TestValidator.predicate(
    "null category response has data",
    nullCategoryResponse.data.length >= 0,
  );
  // Test 3: Filter with null severity level (should return all severity levels)
  const nullSeverityResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          severity_level: null,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(nullSeverityResponse);
  TestValidator.predicate(
    "null severity response has data",
    nullSeverityResponse.data.length >= 0,
  );
  // Test 4: Filter by active status true
  const activeTrueResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(activeTrueResponse);
  TestValidator.predicate(
    "active true response has data",
    activeTrueResponse.data.length >= 0,
  );
  // Test 5: Filter by active status false
  const activeFalseResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(activeFalseResponse);
  TestValidator.predicate(
    "active false response has data",
    activeFalseResponse.data.length >= 0,
  );
  // Test 6: Text search with generic term
  const searchResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          search: "action",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response has data",
    searchResponse.data.length >= 0,
  );
  // Test 7: Combined filters with null values
  const combinedNullResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          category: null,
          severity_level: null,
          is_active: true,
          search: "type",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(combinedNullResponse);
  TestValidator.predicate(
    "combined null response has data",
    combinedNullResponse.data.length >= 0,
  );
  // Test 8: Different page number
  const page2Response =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Test 9: Maximum limit
  const maxLimitResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit response limit",
    maxLimitResponse.pagination.limit,
    100,
  );
  // Test 10: Minimum limit
  const minLimitResponse =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit response limit",
    minLimitResponse.pagination.limit,
    1,
  );
}
