import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivity";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentActivity";
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
 * Test comprehensive search and filtering capabilities for comment activity audit trails.
 * As an administrator investigating comment moderation activities, authenticate as admin,
 * create test articles and comments with various activities (edits, deletions, moderation actions),
 * then use the audit trail endpoint to search across all activity types with date ranges
 * and text filters. Validate that paginated results return complete activity summaries
 * including action types, timestamps, comment context, and actor information.
 * Verify that search filters correctly narrow results and pagination controls work
 * properly with accurate record counts.
 */
export async function test_api_comment_activity_audit_trail_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator account and connection
  const adminJoinResult = await authorize_admin_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminJoinResult.token.access },
  };
  // Create member account and connection
  const memberJoinResult = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberJoinResult);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberJoinResult.token.access },
  };
  // Create test article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple test comments
  const comments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < 3; i++) {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // Generate various comment activities
  // Edit first comment
  const updatedComment =
    await api.functional.discussionBoard.member.articles.comments.update(
      memberConnection,
      {
        articleId: article.id,
        commentId: comments[0].id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Delete second comment
  await api.functional.discussionBoard.member.articles.comments.erase(
    memberConnection,
    {
      articleId: article.id,
      commentId: comments[1].id,
    },
  );
  // Test audit trail search with various filters
  // Test 1: Search by text content
  const searchResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comments[0].id,
        body: {
          search: comments[0].content.substring(0, 10),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search results should contain data",
    searchResults.data.length > 0,
  );
  // Test 2: Filter by action type
  const actionResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comments[0].id,
        body: {
          action: "edit",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(actionResults);
  TestValidator.predicate(
    "action filter should return results",
    actionResults.data.length > 0,
  );
  // Test 3: Date range filtering
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  const endDate = new Date().toISOString();
  const dateResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comments[0].id,
        body: {
          start_date: startDate,
          end_date: endDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(dateResults);
  // Test 4: Pagination validation
  const paginationResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comments[0].id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(paginationResults);
  TestValidator.predicate(
    "pagination should work",
    paginationResults.pagination.limit === 2,
  );
  TestValidator.predicate(
    "current page should be 1",
    paginationResults.pagination.current === 1,
  );
  // Validate activity summary structure
  if (searchResults.data.length > 0) {
    const activity = searchResults.data[0];
    TestValidator.predicate("activity should have id", activity.id.length > 0);
    TestValidator.predicate(
      "activity should have action",
      activity.action.length > 0,
    );
    TestValidator.predicate(
      "activity should have comment",
      activity.comment.id.length > 0,
    );
    TestValidator.predicate(
      "activity should have timestamp",
      activity.created_at.length > 0,
    );
  }
}
