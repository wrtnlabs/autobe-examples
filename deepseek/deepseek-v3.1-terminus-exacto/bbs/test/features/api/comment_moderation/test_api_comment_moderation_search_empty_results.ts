import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_moderation_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator connection using utility function if available
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function authorize_admin_join (must check if available in provided utilities)
  // Since it's provided in available utility functions, we should use it
  const joinResponse = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16) satisfies string &
          tags.Format<"password"> as string & tags.Format<"password">,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(joinResponse);
  // adminConnection headers updated internally by the join function
  // 2. Generate a random comment UUID for search
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test empty search (no moderations exist)
  const emptySearchResult =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          // No filters, just default pagination
          page: 1,
          limit: 10,
          action_type: undefined,
          status: undefined,
          search: undefined,
          admin_email: undefined,
          admin_display_name: undefined,
          created_at_from: undefined,
          created_at_to: undefined,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty results
  TestValidator.equals("data array empty", emptySearchResult.data.length, 0);
  TestValidator.equals(
    "total records zero",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals("pages zero", emptySearchResult.pagination.pages, 0);
  TestValidator.equals(
    "current page 1",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit 10", emptySearchResult.pagination.limit, 10);
  // 4. Test search with non-existent action type
  const nonExistentActionResult =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          action_type: "some-nonexistent-action",
          page: 1,
          limit: 10,
          status: undefined,
          search: undefined,
          admin_email: undefined,
          admin_display_name: undefined,
          created_at_from: undefined,
          created_at_to: undefined,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(nonExistentActionResult);
  TestValidator.equals(
    "non-existent action data empty",
    nonExistentActionResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent action records zero",
    nonExistentActionResult.pagination.records,
    0,
  );
  // 5. Test search with non-existent status
  const nonExistentStatusResult =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          status: "imaginary-status",
          page: 2, // Test page > 1
          limit: 5,
          action_type: undefined,
          search: undefined,
          admin_email: undefined,
          admin_display_name: undefined,
          created_at_from: undefined,
          created_at_to: undefined,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(nonExistentStatusResult);
  TestValidator.equals(
    "non-existent status data empty",
    nonExistentStatusResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent status records zero",
    nonExistentStatusResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 2 with zero records",
    nonExistentStatusResult.pagination.current,
    2,
  );
  TestValidator.equals("limit 5", nonExistentStatusResult.pagination.limit, 5);
  TestValidator.equals(
    "pages zero",
    nonExistentStatusResult.pagination.pages,
    0,
  );
  // 6. Test search with admin email that has no actions
  const adminEmailNoActionsResult =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          admin_email: typia.random<string & tags.Format<"email">>(),
          page: 1,
          limit: 20,
          action_type: undefined,
          status: undefined,
          search: undefined,
          admin_display_name: undefined,
          created_at_from: undefined,
          created_at_to: undefined,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(adminEmailNoActionsResult);
  TestValidator.equals(
    "admin email no actions data empty",
    adminEmailNoActionsResult.data.length,
    0,
  );
  TestValidator.equals(
    "admin email no actions records zero",
    adminEmailNoActionsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "limit 20",
    adminEmailNoActionsResult.pagination.limit,
    20,
  );
  // 7. Test search with date range that yields no matches
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
  const dateRangeNoMatchesResult =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          created_at_from: futureDate satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 10,
          action_type: undefined,
          status: undefined,
          search: undefined,
          admin_email: undefined,
          admin_display_name: undefined,
          created_at_to: undefined,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(dateRangeNoMatchesResult);
  TestValidator.equals(
    "future date range data empty",
    dateRangeNoMatchesResult.data.length,
    0,
  );
  TestValidator.equals(
    "future date range records zero",
    dateRangeNoMatchesResult.pagination.records,
    0,
  );
}
