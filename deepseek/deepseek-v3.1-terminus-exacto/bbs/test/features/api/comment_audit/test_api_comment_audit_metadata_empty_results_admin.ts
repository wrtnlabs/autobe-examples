import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivityMetadatum";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentActivityMetadatum";
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

export async function test_api_comment_audit_metadata_empty_results_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create member connection and register
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
  // Create article with valid section (using a known section or creating one)
  // For this test, we'll use a random section ID as we're testing empty metadata results
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
  // Create comment to generate activity
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Use a valid activity ID (in a real scenario, this would come from comment activity)
  // For empty metadata test, we can use the comment ID as a placeholder
  const activityId = comment.id;
  // Test 1: Search with no filters (should return empty results)
  const emptySearch =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: activityId,
        body: {} satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Validate empty result structure
  TestValidator.equals("data array should be empty", emptySearch.data, []);
  TestValidator.equals(
    "records count should be 0",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count should be 0",
    emptySearch.pagination.pages,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be valid",
    emptySearch.pagination.limit > 0,
  );
  // Test 2: Search with specific key that doesn't exist
  const nonExistentKeySearch =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: activityId,
        body: {
          key: "non_existent_key",
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(nonExistentKeySearch);
  TestValidator.equals(
    "non-existent key search should be empty",
    nonExistentKeySearch.data,
    [],
  );
  // Test 3: Search with specific value pattern that doesn't exist
  const nonExistentValueSearch =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: activityId,
        body: {
          value: "non_existent_value_pattern",
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(nonExistentValueSearch);
  TestValidator.equals(
    "non-existent value search should be empty",
    nonExistentValueSearch.data,
    [],
  );
  // Test 4: Search with date range that has no metadata
  const futureDateSearch =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: activityId,
        body: {
          created_after: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(futureDateSearch);
  TestValidator.equals(
    "future date search should be empty",
    futureDateSearch.data,
    [],
  );
  // Test 5: Search with pagination parameters on empty results
  const paginatedSearch =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: activityId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(paginatedSearch);
  TestValidator.equals(
    "page 1 with empty results should work",
    paginatedSearch.data,
    [],
  );
  TestValidator.equals(
    "page should be 1",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    paginatedSearch.pagination.limit,
    10,
  );
  // Test 6: Combination filter that produces empty set
  const combinationSearch =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: activityId,
        body: {
          key: "old_content",
          value: "specific_content",
          created_after: new Date().toISOString(),
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(combinationSearch);
  TestValidator.equals(
    "combination filter should return empty",
    combinationSearch.data,
    [],
  );
  // Test 7: Validate pagination calculations for empty results
  TestValidator.predicate(
    "records should be 0 for all searches",
    emptySearch.pagination.records === 0 &&
      nonExistentKeySearch.pagination.records === 0 &&
      nonExistentValueSearch.pagination.records === 0 &&
      futureDateSearch.pagination.records === 0 &&
      paginatedSearch.pagination.records === 0 &&
      combinationSearch.pagination.records === 0,
  );
  // Test 8: Ensure data array is never null or undefined
  TestValidator.predicate(
    "data array exists for all searches",
    emptySearch.data !== null &&
      emptySearch.data !== undefined &&
      nonExistentKeySearch.data !== null &&
      nonExistentKeySearch.data !== undefined &&
      nonExistentValueSearch.data !== null &&
      nonExistentValueSearch.data !== undefined &&
      futureDateSearch.data !== null &&
      futureDateSearch.data !== undefined &&
      paginatedSearch.data !== null &&
      paginatedSearch.data !== undefined &&
      combinationSearch.data !== null &&
      combinationSearch.data !== undefined,
  );
}
