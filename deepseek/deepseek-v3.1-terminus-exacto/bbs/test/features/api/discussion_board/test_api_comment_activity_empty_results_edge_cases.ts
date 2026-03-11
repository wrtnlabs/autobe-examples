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

export async function test_api_comment_activity_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 2. Create article for the comment
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
  // 3. Create comment with minimal activity
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 5. Test empty results with various filter combinations
  // Test 1: Empty result set with no activities
  const emptyResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(emptyResults);
  // Validate empty pagination metadata
  TestValidator.equals(
    "empty results should have 0 records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty results should have 0 pages",
    emptyResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results should have current page 1",
    emptyResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty results should have requested limit",
    emptyResults.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty results should have empty data array",
    emptyResults.data.length,
    0,
  );
  // Test 2: Future date range (should return empty)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year in future
  const futureResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          start_date: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(futureResults);
  TestValidator.equals(
    "future date range should have 0 records",
    futureResults.pagination.records,
    0,
  );
  // Test 3: Non-existent action type
  const nonExistentActionResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          action: "non_existent_action",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(nonExistentActionResults);
  TestValidator.equals(
    "non-existent action should have 0 records",
    nonExistentActionResults.pagination.records,
    0,
  );
  // Test 4: Search term with no matches
  const noMatchSearchResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "this_search_term_should_not_match_anything",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(noMatchSearchResults);
  TestValidator.equals(
    "search with no matches should have 0 records",
    noMatchSearchResults.pagination.records,
    0,
  );
  // Test 5: Very small page limit
  const smallLimitResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(smallLimitResults);
  TestValidator.equals(
    "small limit should have correct limit",
    smallLimitResults.pagination.limit,
    1,
  );
  // Test 6: Large page number (should handle gracefully)
  const largePageResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          page: 999,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(largePageResults);
  TestValidator.equals(
    "large page number should handle gracefully",
    largePageResults.pagination.current,
    999,
  );
  TestValidator.equals(
    "large page should have 0 records",
    largePageResults.pagination.records,
    0,
  );
  // Test 7: Combined filters that should yield empty results
  const combinedFiltersResults =
    await api.functional.discussionBoard.admin.articles.comments.activities.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "no_match",
          action: "non_existent",
          start_date: futureDate,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivity.IRequest,
      },
    );
  typia.assert(combinedFiltersResults);
  TestValidator.equals(
    "combined filters should have 0 records",
    combinedFiltersResults.pagination.records,
    0,
  );
}
