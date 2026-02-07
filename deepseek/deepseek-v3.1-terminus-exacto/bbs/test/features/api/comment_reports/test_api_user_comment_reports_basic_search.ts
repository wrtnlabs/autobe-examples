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

export async function test_api_user_comment_reports_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a user
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
  // Perform search with default pagination parameters
  const searchResult =
    await api.functional.discussionBoard.user.comments.reports.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata structure
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be a non-negative number",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    searchResult.pagination.pages ===
      Math.ceil(
        searchResult.pagination.records / searchResult.pagination.limit,
      ),
  );
  // Validate that data array exists
  TestValidator.predicate(
    "data array should exist",
    Array.isArray(searchResult.data),
  );
  // Verify each report summary includes required fields (if reports exist)
  for (const report of searchResult.data) {
    TestValidator.predicate(
      "report should have id",
      typeof report.id === "string",
    );
    TestValidator.predicate(
      "report should have status",
      typeof report.status === "string",
    );
    TestValidator.predicate(
      "report should have reason",
      typeof report.reason === "string",
    );
    TestValidator.predicate(
      "report should have created_at",
      typeof report.created_at === "string",
    );
    TestValidator.predicate(
      "report should have reporter information",
      typeof report.reporter === "object",
    );
    if (report.reporter) {
      TestValidator.predicate(
        "reporter should have id",
        typeof report.reporter.id === "string",
      );
      TestValidator.predicate(
        "reporter should have display_name",
        typeof report.reporter.display_name === "string",
      );
      TestValidator.predicate(
        "reporter should have bio",
        report.reporter.bio === null || typeof report.reporter.bio === "string",
      );
      TestValidator.predicate(
        "reporter should have created_at",
        typeof report.reporter.created_at === "string",
      );
      TestValidator.predicate(
        "reporter should have updated_at",
        typeof report.reporter.updated_at === "string",
      );
    }
  }
}
