import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_comment_reports_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate user
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
  // Note: Since there are no comment report creation endpoints or utility functions
  // provided in the available API functions, we can only test the filtering functionality
  // with existing data or demonstrate the filtering logic
  const statuses = ["pending", "under_review", "resolved"] as const;
  // Test filtering by each status
  for (const status of statuses) {
    const filterRequest = {
      status,
      page: 1,
      limit: 10,
      sort: "created_at_desc" as const,
    } satisfies IDiscussionBoardCommentReport.IRequest;
    const filteredResponse =
      await api.functional.discussionBoard.user.comments.reports.index(
        userConnection,
        { body: filterRequest },
      );
    typia.assert(filteredResponse);
    // Verify all returned reports match the filter status (if any reports exist)
    if (filteredResponse.data.length > 0) {
      TestValidator.predicate(
        `all reports should have status ${status}`,
        filteredResponse.data.every((report) => report.status === status),
      );
    }
    // Validate pagination metadata
    TestValidator.equals(
      `pagination current page for ${status}`,
      filteredResponse.pagination.current,
      1,
    );
    TestValidator.equals(
      `pagination limit for ${status}`,
      filteredResponse.pagination.limit,
      10,
    );
    TestValidator.predicate(
      `pagination records count for ${status}`,
      filteredResponse.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages count for ${status}`,
      filteredResponse.pagination.pages >= 0,
    );
  }
}
