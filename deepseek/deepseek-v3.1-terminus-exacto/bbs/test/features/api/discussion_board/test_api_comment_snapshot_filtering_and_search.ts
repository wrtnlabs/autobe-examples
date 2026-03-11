import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_snapshot_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: "Test comment for snapshot filtering.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Test basic snapshot retrieval without filters
  const allSnapshots =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Test 1: Filter by edit reason (empty result expected since no edits)
  const reasonFiltered =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          edit_reason: "typo correction",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(reasonFiltered);
  // Test 2: Date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const dateFiltered =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_start: oneHourAgo,
          created_at_end: oneHourLater,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Test 3: Content search
  const searchFiltered =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "snapshot",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(searchFiltered);
  // Test 4: Combined filters
  const combinedFiltered =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          edit_reason: "clarification",
          search: "test",
          created_at_start: oneHourAgo,
          created_at_end: oneHourLater,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // Test 5: Empty result set validation
  const emptyResult =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          edit_reason: "non-existent-reason-12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination metadata exists",
    allSnapshots.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has current page",
    typeof allSnapshots.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof allSnapshots.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof allSnapshots.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof allSnapshots.pagination.pages,
    "number",
  );
  // Validate snapshot structure
  if (allSnapshots.data.length > 0) {
    const snapshot = allSnapshots.data[0];
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
    // Validate chronological ordering if multiple snapshots exist
    if (allSnapshots.data.length > 1) {
      for (let i = 1; i < allSnapshots.data.length; i++) {
        const currentTime = new Date(allSnapshots.data[i].created_at);
        const previousTime = new Date(allSnapshots.data[i - 1].created_at);
        TestValidator.predicate(
          "snapshots ordered chronologically",
          currentTime >= previousTime,
        );
      }
    }
  }
  // Test edge case: invalid date range (end before start)
  const invalidDateRange =
    await api.functional.discussionBoard.articles.comments.snapshots.index(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          created_at_start: oneHourLater,
          created_at_end: oneHourAgo,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentSnapshot.IRequest,
      },
    );
  typia.assert(invalidDateRange);
}
