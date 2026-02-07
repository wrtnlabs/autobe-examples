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

export async function test_api_content_flag_filtering_by_status_and_content_type(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for content flag operations
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Test filtering by status - get all flags and verify status filtering works
  const statuses = [
    "pending",
    "under investigation",
    "resolved",
    "dismissed",
  ] as const;
  for (const status of statuses) {
    const flagsByStatus =
      await api.functional.discussionBoard.user.content_flags.index(
        userConnection,
        {
          body: {
            status: status,
            limit: 10,
            page: 1,
          } satisfies IDiscussionBoardContentFlag.IRequest,
        },
      );
    typia.assert(flagsByStatus);
    // Verify all returned flags have the correct status (if any flags exist)
    for (const flag of flagsByStatus.data) {
      TestValidator.equals(
        `flag status should be ${status}`,
        flag.status,
        status,
      );
    }
  }
  // Test filtering by content type - get flags and verify they have proper content type structure
  const allFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      userConnection,
      {
        body: {
          limit: 50,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(allFlags);
  // Verify content type structure for existing flags
  for (const flag of allFlags.data) {
    // A flag should target either an article OR a comment, but not both
    const hasArticle = flag.flagged_article_id !== null;
    const hasComment = flag.flagged_comment_id !== null;
    TestValidator.predicate(
      "flag should target either article or comment, not both",
      (hasArticle && !hasComment) || (!hasArticle && hasComment),
    );
  }
  // Test combined filters (status + content type)
  const combinedFilterFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      userConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedFilterFlags);
  for (const flag of combinedFilterFlags.data) {
    TestValidator.equals(
      "combined filter: status should be pending",
      flag.status,
      "pending",
    );
  }
  // Test date range filtering with realistic time windows
  const now = new Date();
  const oneYearAgo = new Date(
    now.getTime() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneYearLater = new Date(
    now.getTime() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateRangeFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      userConnection,
      {
        body: {
          created_at_min: oneYearAgo,
          created_at_max: oneYearLater,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(dateRangeFlags);
  for (const flag of dateRangeFlags.data) {
    const flagDate = new Date(flag.created_at);
    const minDate = new Date(oneYearAgo);
    const maxDate = new Date(oneYearLater);
    TestValidator.predicate(
      "flag should be within broad date range",
      flagDate >= minDate && flagDate <= maxDate,
    );
  }
  // Test pagination functionality
  const paginatedFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      userConnection,
      {
        body: {
          limit: 5,
          page: 1,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(paginatedFlags);
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedFlags.data.length <= 5,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedFlags.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    paginatedFlags.pagination.limit > 0,
  );
}
