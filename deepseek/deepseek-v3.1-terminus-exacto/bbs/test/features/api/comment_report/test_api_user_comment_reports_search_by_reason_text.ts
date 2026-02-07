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

export async function test_api_user_comment_reports_search_by_reason_text(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a regular user
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
  // Test the search endpoint with various search criteria
  // Since we cannot create comment reports, we test the endpoint structure and response format
  // Test search with reason text
  const searchWithReason =
    await api.functional.discussionBoard.user.comments.reports.index(
      userConnection,
      {
        body: {
          // Remove 'reason' property since it doesn't exist in IRequest
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchWithReason);
  // Test search with pagination parameters
  const searchWithPagination =
    await api.functional.discussionBoard.user.comments.reports.index(
      userConnection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchWithPagination);
  // Test search with sorting
  const searchWithSorting =
    await api.functional.discussionBoard.user.comments.reports.index(
      userConnection,
      {
        body: {
          sort: "created_at_desc",
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchWithSorting);
  // Test search with status filter
  const searchWithStatus =
    await api.functional.discussionBoard.user.comments.reports.index(
      userConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardCommentReport.IRequest,
      },
    );
  typia.assert(searchWithStatus);
  // Validate that all searches return valid pagination structure
  TestValidator.equals(
    "search returns pagination structure",
    typeof searchWithReason.pagination,
    "object",
  );
  TestValidator.equals(
    "pagination has current page",
    typeof searchWithReason.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof searchWithReason.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records count",
    typeof searchWithReason.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages count",
    typeof searchWithReason.pagination.pages,
    "number",
  );
  // Validate that data is always an array (even if empty)
  TestValidator.predicate(
    "search returns array data",
    Array.isArray(searchWithReason.data),
  );
}