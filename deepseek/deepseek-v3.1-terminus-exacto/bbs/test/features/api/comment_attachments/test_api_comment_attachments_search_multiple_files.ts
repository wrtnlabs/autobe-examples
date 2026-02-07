import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentAttachment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test searching for comment attachments with multiple files attached to a comment.
 * Since attachment creation functionality is not available in the current API,
 * this test focuses on validating the search endpoint's response structure and
 * pagination capabilities for existing comment attachments.
 */
export async function test_api_comment_attachments_search_multiple_files(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create an article to serve as parent container for comments
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
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
  // Test search functionality with various parameters
  // Note: Since attachment creation is not available, we test the search endpoint structure
  const searchResults =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: "",
          file_type: undefined,
          created_at_from: undefined,
          created_at_to: undefined,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    searchResults.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResults.pagination.limit, 10);
  TestValidator.predicate(
    "records count non-negative",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count non-negative",
    searchResults.pagination.pages >= 0,
  );
  // Validate that data is an array (may be empty since no attachments created)
  TestValidator.predicate("data is array", Array.isArray(searchResults.data));
  // If there are attachments returned, validate their structure
  for (const attachment of searchResults.data) {
    TestValidator.predicate(
      "attachment has valid id",
      /^[0-9a-f-]{36}$/i.test(attachment.id),
    );
    TestValidator.predicate(
      "attachment has filename",
      attachment.file_name.length > 0,
    );
    TestValidator.predicate(
      "attachment has file type",
      attachment.file_type.length > 0,
    );
    TestValidator.predicate(
      "attachment has non-negative file size",
      attachment.file_size >= 0,
    );
    TestValidator.predicate(
      "attachment has ISO timestamp",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(attachment.created_at),
    );
  }
  // Test search with specific file type filter
  const typeFilterResults =
    await api.functional.discussionBoard.articles.comments.attachments.index(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          search: undefined,
          file_type: "application/pdf",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardCommentAttachment.IRequest,
      },
    );
  typia.assert(typeFilterResults);
  // Validate pagination structure for filtered results
  TestValidator.equals(
    "filtered pagination current page",
    typeFilterResults.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    typeFilterResults.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "filtered records count non-negative",
    typeFilterResults.pagination.records >= 0,
  );
}
