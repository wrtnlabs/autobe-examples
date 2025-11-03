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
 * Test guest user access to discussion board comments.
 *
 * This test validates that unauthenticated users (guests) can successfully
 * retrieve and view specific comments on articles without requiring login
 * credentials. This demonstrates the platform's commitment to open access for
 * substantive economic and political discussions.
 *
 * Test workflow:
 *
 * 1. Create moderator account for test data setup
 * 2. Create article category prerequisite
 * 3. Create article to host the comment
 * 4. Post a comment on the article
 * 5. Retrieve comment without authentication (as guest)
 * 6. Validate complete comment data returned
 * 7. Verify all comment information is accessible
 */
export async function test_api_comment_retrieval_by_guest(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create category for article
  const category: IDiscussionBoardCategory =
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

  // Step 3: Create article to host comment
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Post comment on the article
  const commentContent = RandomGenerator.content({ paragraphs: 2 });
  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);

  // Step 5: Retrieve comment as guest (without authentication)
  const guestConnection: api.IConnection = { ...connection, headers: {} };
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(guestConnection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 6: Validate comment data is complete
  TestValidator.equals(
    "comment ID matches created comment",
    retrievedComment.id,
    createdComment.id,
  );

  // Step 7: Verify comment content is accessible
  TestValidator.equals(
    "comment content is accessible to guest",
    retrievedComment.content,
    commentContent,
  );

  // Step 8: Verify author information is included
  TestValidator.predicate(
    "author information is present",
    retrievedComment.author_type === "moderator" &&
      retrievedComment.moderatorAuthor !== null &&
      retrievedComment.moderatorAuthor !== undefined,
  );

  if (retrievedComment.moderatorAuthor) {
    TestValidator.equals(
      "author username matches moderator",
      retrievedComment.moderatorAuthor.username,
      moderator.username,
    );
  }

  // Step 9: Verify timestamps are present
  TestValidator.predicate(
    "created timestamp is present",
    retrievedComment.created_at !== null &&
      retrievedComment.created_at !== undefined &&
      retrievedComment.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated timestamp is present",
    retrievedComment.updated_at !== null &&
      retrievedComment.updated_at !== undefined &&
      retrievedComment.updated_at.length > 0,
  );

  // Step 10: Verify threading context is available
  TestValidator.equals(
    "parent article ID is accessible",
    retrievedComment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "comment is top-level (no parent comment)",
    retrievedComment.discussion_board_parent_comment_id,
    null,
  );
}
