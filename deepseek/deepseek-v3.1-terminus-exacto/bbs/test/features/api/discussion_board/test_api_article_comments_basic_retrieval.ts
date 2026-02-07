import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
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
 * Test the basic functionality of retrieving comments for an article without any filtering or pagination parameters.
 * Create an article with multiple comments from different users, then call the comments endpoint with default parameters.
 * Verify that all comments are returned in chronological order (oldest first), each comment includes the correct content,
 * author information (display name and bio), and creation timestamps. Ensure the pagination metadata correctly reflects
 * the total comment count and page information.
 */
export async function test_api_article_comments_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Import utility functions (these would be available in the test environment)
  // Note: In actual implementation, these would be imported at the top of the file
  // Create three different users
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user2);
  const user3Connection: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(user3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(user3);
  // For this test, we need to use a valid section_id that exists in the system
  // Since we don't have section creation utility, we'll use a random UUID that should exist
  // In a real scenario, we would create a section first
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article using user1
  const article = await generate_random_discussion_board_user_articles_create(
    user1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // Create multiple comments from different users and store them for validation
  const createdComments: IDiscussionBoardComment[] = [];
  const comment1Content = RandomGenerator.paragraph({ sentences: 2 });
  const comment1 =
    await generate_random_discussion_board_user_articles_comments_create(
      user1Connection,
      {
        body: { content: comment1Content },
        params: { articleId: article.id },
      },
    );
  typia.assert(comment1);
  createdComments.push(comment1);
  const comment2Content = RandomGenerator.paragraph({ sentences: 2 });
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      user2Connection,
      {
        body: { content: comment2Content },
        params: { articleId: article.id },
      },
    );
  typia.assert(comment2);
  createdComments.push(comment2);
  const comment3Content = RandomGenerator.paragraph({ sentences: 2 });
  const comment3 =
    await generate_random_discussion_board_user_articles_comments_create(
      user3Connection,
      {
        body: { content: comment3Content },
        params: { articleId: article.id },
      },
    );
  typia.assert(comment3);
  createdComments.push(comment3);
  // Create a new connection for the comments endpoint call
  const commentsConnection: api.IConnection = { host: connection.host };
  // Call the comments endpoint with default parameters
  const commentsResponse =
    await api.functional.discussionBoard.articles.comments.index(
      commentsConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(commentsResponse);
  // Validate pagination metadata
  TestValidator.equals("total records", commentsResponse.pagination.records, 3);
  TestValidator.equals("current page", commentsResponse.pagination.current, 1);
  TestValidator.equals("limit", commentsResponse.pagination.limit, 20);
  TestValidator.equals("total pages", commentsResponse.pagination.pages, 1);
  // Validate chronological order (oldest first)
  TestValidator.equals("number of comments", commentsResponse.data.length, 3);
  // Check that comments are sorted by created_at ascending (oldest first)
  for (let i = 0; i < commentsResponse.data.length - 1; i++) {
    const currentComment = commentsResponse.data[i];
    const nextComment = commentsResponse.data[i + 1];
    TestValidator.predicate(
      `comment ${i} created before comment ${i + 1}`,
      new Date(currentComment.created_at) <= new Date(nextComment.created_at),
    );
  }
  // Verify each comment contains the correct structure and matches our created comments
  const retrievedCommentIds = commentsResponse.data.map(
    (comment) => comment.id,
  );
  const createdCommentIds = createdComments.map((comment) => comment.id);
  // Check that all created comments are present in the response
  for (const createdCommentId of createdCommentIds) {
    TestValidator.predicate(
      `comment ${createdCommentId} exists in response`,
      retrievedCommentIds.includes(createdCommentId),
    );
  }
  // Verify comment structure for each retrieved comment
  for (const comment of commentsResponse.data) {
    // Check basic structure
    TestValidator.predicate(
      "comment has id",
      comment.id !== undefined && comment.id !== "",
    );
    TestValidator.predicate(
      "comment has content",
      comment.content !== undefined && comment.content !== "",
    );
    TestValidator.predicate(
      "comment has creation timestamp",
      comment.created_at !== undefined && comment.created_at !== "",
    );
    // Check author structure
    TestValidator.predicate("comment has author", comment.author !== undefined);
    TestValidator.predicate(
      "author has id",
      comment.author.id !== undefined && comment.author.id !== "",
    );
    TestValidator.predicate(
      "author has display name",
      comment.author.display_name !== undefined &&
        comment.author.display_name !== "",
    );
    // Author bio can be null, so we just check it exists
    TestValidator.predicate(
      "author bio field exists",
      comment.author.bio !== undefined,
    );
  }
}
