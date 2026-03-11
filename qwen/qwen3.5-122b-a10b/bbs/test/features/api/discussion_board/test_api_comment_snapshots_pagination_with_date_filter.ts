import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test comment snapshots pagination with date filtering for audit review workflows.
 * Validates that administrators can retrieve historical comment modifications with
 * pagination and temporal filtering for moderation investigations.
 */
export async function test_api_comment_snapshots_pagination_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Admin creates article using utility function
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // 3. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member creates comment using utility function
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 5. Member edits comment 5 times to create snapshots
  const editContents = ArrayUtil.repeat(
    5,
    (index) =>
      ({
        content: `Edited content ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
      }) satisfies IDiscussionBoardComment.IUpdate,
  );
  for (const edit of editContents) {
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: edit,
      },
    );
  }
  // 6. Admin retrieves snapshots with pagination (page=1, limit=2)
  const paginatedResponse =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // 7. Verify response contains exactly 2 snapshots
  TestValidator.equals(
    "pagination data count",
    paginatedResponse.data.length,
    2,
  );
  // 8. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records",
    paginatedResponse.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination total pages",
    paginatedResponse.pagination.pages,
    3,
  );
  // Verify snapshots are ordered by snapshot_created_at DESC (newest first)
  for (let i = 0; i < paginatedResponse.data.length - 1; i++) {
    TestValidator.predicate(
      `snapshot ${i} is newer than snapshot ${i + 1}`,
      paginatedResponse.data[i].snapshot_created_at >
        paginatedResponse.data[i + 1].snapshot_created_at,
    );
  }
  // 9. Admin retrieves snapshots with date filter
  const firstSnapshot =
    paginatedResponse.data[paginatedResponse.data.length - 1];
  const lastSnapshot = paginatedResponse.data[0];
  const filteredResponse =
    await api.functional.discussionBoard.admin.articles.comments.snapshots.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          from: firstSnapshot.snapshot_created_at,
          to: lastSnapshot.snapshot_created_at,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 10. Verify filtered response contains snapshots within date range
  TestValidator.equals("filtered data count", filteredResponse.data.length, 2);
  // Verify all filtered snapshots are within the date range
  for (const snapshot of filteredResponse.data) {
    TestValidator.predicate(
      "snapshot within from date",
      snapshot.snapshot_created_at >= firstSnapshot.snapshot_created_at,
    );
    TestValidator.predicate(
      "snapshot within to date",
      snapshot.snapshot_created_at <= lastSnapshot.snapshot_created_at,
    );
  }
  // 11. Verify pagination metadata reflects filtered count
  TestValidator.equals(
    "filtered pagination records",
    filteredResponse.pagination.records,
    2,
  );
}
