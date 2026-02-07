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
 * Test pagination functionality for moderation action types listing.
 * An administrator authenticates and requests moderation action types with specific
 * pagination parameters (page and limit). Verify that the pagination metadata in
 * the response correctly reflects the current page, limit, total records, and total
 * pages. Test navigating through multiple pages to ensure consistent pagination
 * behavior and validate that the data array size matches the specified limit
 * (except for the last page).
 */
export async function test_api_moderation_action_types_pagination_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test pagination with different page and limit combinations
  const testCases = [
    {
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    },
    {
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    },
    {
      page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    },
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.admin.moderation_action_types.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardModerationActionType.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      "current page",
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals("limit", response.pagination.limit, testCase.limit);
    TestValidator.predicate(
      "records is non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pages is non-negative",
      response.pagination.pages >= 0,
    );
    // Validate data array size matches limit (except for last page)
    if (testCase.page < response.pagination.pages) {
      TestValidator.equals(
        "data size matches limit",
        response.data.length,
        testCase.limit,
      );
    } else {
      TestValidator.predicate(
        "data size <= limit on last page",
        response.data.length <= testCase.limit,
      );
    }
    // Validate each moderation action type summary
    for (const actionType of response.data) {
      typia.assert(actionType);
      TestValidator.predicate("has id", actionType.id.length > 0);
      TestValidator.predicate("has code", actionType.code.length > 0);
      TestValidator.predicate("has name", actionType.name.length > 0);
      TestValidator.predicate(
        "has is_active",
        typeof actionType.is_active === "boolean",
      );
    }
  }
  // Test edge case: page beyond total pages
  const largePageResponse =
    await api.functional.discussionBoard.admin.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(largePageResponse);
  TestValidator.predicate(
    "empty or limited data for large page",
    largePageResponse.data.length <= largePageResponse.pagination.limit,
  );
}
