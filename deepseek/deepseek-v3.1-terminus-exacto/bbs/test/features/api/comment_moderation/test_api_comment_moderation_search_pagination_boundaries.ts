import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentModeration";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { generate_random_discussion_board_admin_comments_moderations_create } from "../../../generate/generate_random_discussion_board_admin_comments_moderations_create";
import { prepare_random_discussion_board_comment_moderation } from "../../../prepare/prepare_random_discussion_board_comment_moderation";

export async function test_api_comment_moderation_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
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
  // Create a comment ID for testing
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Create multiple moderation records (more than default page size)
  const moderationRecords = ArrayUtil.repeat(
    35,
    (index) =>
      ({
        action_type: RandomGenerator.pick([
          "edit",
          "delete",
          "approve",
          "reject",
        ] as const),
        reason: RandomGenerator.paragraph({ sentences: 2 }),
        status: RandomGenerator.pick([
          "pending",
          "completed",
          "reversed",
        ] as const),
        discussion_board_comment_id: commentId,
      }) satisfies IDiscussionBoardCommentModeration.ICreate,
  );
  // Create moderation records
  for (const record of moderationRecords) {
    await generate_random_discussion_board_admin_comments_moderations_create(
      adminConnection,
      {
        body: record,
        params: { commentId },
      },
    );
  }
  // Test 1: First page with default limit
  const firstPage =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals(
    "first page records count",
    firstPage.pagination.records,
    35,
  );
  TestValidator.equals("first page total pages", firstPage.pagination.pages, 4);
  TestValidator.equals("first page data count", firstPage.data.length, 10);
  // Test 2: Last page with remaining records
  const lastPage =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          page: 4,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page current page",
    lastPage.pagination.current,
    4,
  );
  TestValidator.equals("last page limit", lastPage.pagination.limit, 10);
  TestValidator.equals(
    "last page records count",
    lastPage.pagination.records,
    35,
  );
  TestValidator.equals("last page total pages", lastPage.pagination.pages, 4);
  TestValidator.equals("last page data count", lastPage.data.length, 5);
  // Test 3: Out-of-bounds page number
  const outOfBoundsPage =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          page: 100,
          limit: 10,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(outOfBoundsPage);
  TestValidator.equals(
    "out of bounds page current",
    outOfBoundsPage.pagination.current,
    100,
  );
  TestValidator.equals(
    "out of bounds page limit",
    outOfBoundsPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "out of bounds page records",
    outOfBoundsPage.pagination.records,
    35,
  );
  TestValidator.equals(
    "out of bounds page total pages",
    outOfBoundsPage.pagination.pages,
    4,
  );
  TestValidator.equals(
    "out of bounds page empty data",
    outOfBoundsPage.data.length,
    0,
  );
  // Test 4: Various limit values
  const limits = [1, 15, 50, 100] as const;
  for (const limit of limits) {
    const page =
      await api.functional.discussionBoard.admin.comments.moderations.index(
        adminConnection,
        {
          commentId,
          body: {
            page: 1,
            limit,
          } satisfies IDiscussionBoardCommentModeration.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      `limit ${limit} current page`,
      page.pagination.current,
      1,
    );
    TestValidator.equals(
      `limit ${limit} specified limit`,
      page.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `limit ${limit} records count`,
      page.pagination.records,
      35,
    );
    const expectedPages = Math.ceil(35 / limit);
    TestValidator.equals(
      `limit ${limit} total pages`,
      page.pagination.pages,
      expectedPages,
    );
    TestValidator.predicate(
      `limit ${limit} data count valid`,
      page.data.length <= limit && page.data.length >= 1,
    );
  }
  // Test 5: Pagination with filtering
  const filteredPage =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          page: 1,
          limit: 10,
          action_type: "edit",
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered pagination valid",
    filteredPage.pagination.records <= 35,
  );
  TestValidator.predicate(
    "filtered data matches criteria",
    filteredPage.data.every((item) => item.action_type === "edit"),
  );
  // Test 6: Zero limit (minimum allowed)
  const zeroLimitPage =
    await api.functional.discussionBoard.admin.comments.moderations.index(
      adminConnection,
      {
        commentId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardCommentModeration.IRequest,
      },
    );
  typia.assert(zeroLimitPage);
  TestValidator.equals(
    "minimum limit current page",
    zeroLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "minimum limit specified limit",
    zeroLimitPage.pagination.limit,
    1,
  );
  TestValidator.equals(
    "minimum limit data count",
    zeroLimitPage.data.length,
    1,
  );
}
