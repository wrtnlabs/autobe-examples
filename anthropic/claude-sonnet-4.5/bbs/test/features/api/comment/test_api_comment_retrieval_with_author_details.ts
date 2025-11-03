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
 * Test retrieval of a comment including complete author information.
 *
 * This test validates that author attribution is properly included with
 * comments through the author_type discriminator pattern. It creates a
 * moderator account, creates supporting entities (category and article), posts
 * a comment as the moderator, and then retrieves the comment to verify complete
 * author information is included without exposing sensitive data.
 *
 * Steps:
 *
 * 1. Create moderator account for authentication and authorship
 * 2. Create category required for article creation
 * 3. Create article to host the comment
 * 4. Post comment as moderator to establish moderator authorship
 * 5. Retrieve comment by ID to verify author information
 * 6. Validate author_type discriminator is "moderator"
 * 7. Verify moderatorAuthor field is populated (mutual exclusivity)
 * 8. Verify memberAuthor field is null (mutual exclusivity)
 */
export async function test_api_comment_retrieval_with_author_details(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);
  const moderatorDisplayName = RandomGenerator.name(2);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
      display_name: moderatorDisplayName,
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      location: "Seoul, South Korea",
      website_url: "https://example.com",
      profile_picture_url: "https://example.com/avatar.jpg",
      href: "https://discussion-board.com/auth/moderator/join",
      referrer: "https://discussion-board.com/home",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category for article creation
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to host comment
  const article =
    await api.functional.discussionBoard.moderator.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: Post comment as moderator
  const commentContent = RandomGenerator.content({ paragraphs: 2 });
  const createdComment =
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

  // Step 5: Retrieve comment by ID
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 6: Validate author_type discriminator is set to "moderator"
  TestValidator.equals(
    "author_type should be moderator",
    retrievedComment.author_type,
    "moderator",
  );

  // Step 7: Verify moderatorAuthor field is populated (mutual exclusivity)
  TestValidator.predicate(
    "moderatorAuthor should be populated",
    retrievedComment.moderatorAuthor !== null &&
      retrievedComment.moderatorAuthor !== undefined,
  );

  // Step 8: Verify memberAuthor field is null (mutual exclusivity)
  TestValidator.equals(
    "memberAuthor should be null for moderator comments",
    retrievedComment.memberAuthor,
    null,
  );
}
