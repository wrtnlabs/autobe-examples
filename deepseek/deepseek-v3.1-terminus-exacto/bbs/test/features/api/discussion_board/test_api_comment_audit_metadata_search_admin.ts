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

export async function test_api_comment_audit_metadata_search_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
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
  // Create article as member
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
  // Create comment on article
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
  // Since we don't have API functions to create comment activities or metadata,
  // we'll test the search endpoint with various filter combinations to validate
  // the hierarchical relationship validation and pagination structure
  // Test search with empty filters
  const emptySearchResult =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    emptySearchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    emptySearchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    emptySearchResult.pagination.pages >= 0,
  );
  // Test search with key filter
  const keySearchResult =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          key: "old_content",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(keySearchResult);
  // Test search with date range filters
  const dateSearchResult =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          created_after: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 1 week ago
          created_before: new Date().toISOString(),
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(dateSearchResult);
  // Test search with value pattern filter
  const valueSearchResult =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          value: "test",
          page: 2,
          limit: 15,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(valueSearchResult);
  // Test search with combined filters
  const combinedSearchResult =
    await api.functional.discussionBoard.admin.articles.comments.activities.metadata.index(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        activityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          key: "changed_fields",
          value: "content",
          created_after: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days ago
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardCommentActivityMetadatum.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  // Validate that all search results maintain proper data structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(emptySearchResult.data),
  );
  TestValidator.predicate(
    "key search data is array",
    Array.isArray(keySearchResult.data),
  );
  TestValidator.predicate(
    "date search data is array",
    Array.isArray(dateSearchResult.data),
  );
  TestValidator.predicate(
    "value search data is array",
    Array.isArray(valueSearchResult.data),
  );
  TestValidator.predicate(
    "combined search data is array",
    Array.isArray(combinedSearchResult.data),
  );
}
