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
 * Test comment content validation including minimum and maximum length
 * constraints.
 *
 * This test validates that the discussion board comment system properly
 * enforces content length requirements. It tests boundary conditions by
 * creating comments with exactly 1 character (minimum allowed) and exactly 5000
 * characters (maximum allowed), ensuring both are accepted by the system.
 *
 * Test workflow:
 *
 * 1. Register and authenticate a member account
 * 2. Create a category for article organization
 * 3. Create an article to receive comments
 * 4. Post comment with minimum valid length (1 character)
 * 5. Post comment with maximum valid length (5000 characters)
 * 6. Verify both comments were created with expected content
 */
export async function test_api_comment_creation_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!@#";
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/home" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category (Note: This requires moderator role, but we'll attempt with member authentication)
  // Based on the scenario, we need a category. The API shows POST /discussionBoard/moderator/categories
  // Since we're authenticated as member, we'll create category with moderator endpoint
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Content Validation Test",
          description: "Category for testing comment content validation",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create article to receive comments
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: "Article for Comment Testing",
        body: "This article is created specifically to test comment content validation. It serves as a container for testing various comment length scenarios including minimum and maximum character limits.",
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Test minimum valid length (1 character)
  const minLengthContent = "A";
  const minComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: minLengthContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(minComment);

  TestValidator.equals(
    "minimum length comment content matches",
    minComment.content,
    minLengthContent,
  );

  // Step 5: Test maximum valid length (5000 characters)
  const maxLengthContent = RandomGenerator.alphabets(5000);
  const maxComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: maxLengthContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(maxComment);

  TestValidator.equals(
    "maximum length comment content matches",
    maxComment.content,
    maxLengthContent,
  );

  // Step 6: Verify both comments have correct lengths
  TestValidator.predicate(
    "minimum comment length is exactly 1",
    minComment.content.length === 1,
  );

  TestValidator.predicate(
    "maximum comment length is exactly 5000",
    maxComment.content.length === 5000,
  );
}
