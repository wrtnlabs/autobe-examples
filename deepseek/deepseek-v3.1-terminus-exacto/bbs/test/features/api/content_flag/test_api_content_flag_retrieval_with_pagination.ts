import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test content flag retrieval with pagination controls.
 * Tests pagination functionality with various page/limit combinations
 * and validates pagination metadata calculations.
 */
export async function test_api_content_flag_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for testing
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Test pagination with different combinations
  const testCases = [
    { page: 1, limit: 5 }, // First page, small limit
    { page: 2, limit: 5 }, // Second page
    { page: 1, limit: 10 }, // First page, larger limit
    { page: 2, limit: 10 }, // Second page with larger limit
    { page: 3, limit: 6 }, // Third page with different limit
  ];
  for (const testCase of testCases) {
    const response =
      await api.functional.discussionBoard.user.content_flags.index(
        userConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `pagination limit for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `pagination records count positive for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages count valid for page=${testCase.page}, limit=${testCase.limit}`,
      response.pagination.pages >= 0,
    );
    // Validate data structure (business logic only, no type validation)
    response.data.forEach((flag, index) => {
      TestValidator.predicate(
        `flag ${index} has non-empty flag_reason for page=${testCase.page}, limit=${testCase.limit}`,
        flag.flag_reason.length > 0,
      );
    });
  }
  // Test edge cases
  // Test page beyond total pages (should return empty data)
  const beyondPageResponse =
    await api.functional.discussionBoard.user.content_flags.index(
      userConnection,
      {
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(beyondPageResponse);
  TestValidator.equals(
    "empty data for page beyond total pages",
    beyondPageResponse.data.length,
    0,
  );
  // Test filtering by status
  const pendingFlagsResponse =
    await api.functional.discussionBoard.user.content_flags.index(
      userConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(pendingFlagsResponse);
  TestValidator.predicate(
    "all flags have pending status when filtered",
    pendingFlagsResponse.data.every((flag) => flag.status === "pending"),
  );
}
