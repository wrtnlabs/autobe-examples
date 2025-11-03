import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test retrieval of a reply comment to verify parent comment reference and
 * threading context.
 *
 * This test validates that when retrieving a reply comment, the response
 * properly includes the parent comment reference
 * (discussion_board_parent_comment_id) and maintains correct threading context.
 * The test establishes a single-level thread structure with a top-level comment
 * and one reply, then verifies the reply retrieval includes all threading
 * metadata.
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create category for article organization
 * 3. Create article to host comment thread
 * 4. Post top-level comment on the article
 * 5. Post reply comment referencing the top-level comment
 * 6. Retrieve the reply comment using GET endpoint
 * 7. Validate parent comment reference is present
 * 8. Verify threading context and article association
 * 9. Confirm single-level threading structure
 */
export async function test_api_comment_retrieval_with_threading_context(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category required for article creation
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to host the comment thread
  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Post a top-level comment on the article
  const topLevelComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(topLevelComment);

  // Step 5: Post a reply comment referencing the top-level comment
  const replyComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: topLevelComment.id,
          content: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Step 6: Retrieve the reply comment by its ID using the target GET endpoint
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: replyComment.id,
    });
  typia.assert(retrievedComment);

  // Step 7: Validate parent comment reference is included
  TestValidator.predicate(
    "reply comment should have parent comment reference",
    retrievedComment.discussion_board_parent_comment_id !== null &&
      retrievedComment.discussion_board_parent_comment_id !== undefined,
  );

  // Step 8: Verify threading context shows the parent relationship
  TestValidator.equals(
    "parent comment ID should match top-level comment",
    retrievedComment.discussion_board_parent_comment_id,
    topLevelComment.id,
  );

  // Step 9: Verify the reply is associated with the correct article
  TestValidator.equals(
    "reply comment should be associated with correct article",
    retrievedComment.discussion_board_article_id,
    article.id,
  );

  // Step 10: Verify single-level threading structure
  TestValidator.predicate(
    "top-level comment should not have parent reference",
    topLevelComment.discussion_board_parent_comment_id === null,
  );
}
