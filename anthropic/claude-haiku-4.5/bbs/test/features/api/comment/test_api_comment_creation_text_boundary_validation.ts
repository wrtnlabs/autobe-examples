import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test comment creation with text content at boundary conditions.
 *
 * This test validates that the comment creation API correctly enforces the
 * 1-5000 character constraint for comment body text. We test both valid
 * boundary cases (minimum 1 character, maximum 5000 characters) and invalid
 * cases (0 characters, over 5000 characters) to ensure proper validation and
 * error handling.
 *
 * The test workflow:
 *
 * 1. Create and authenticate a moderator
 * 2. Create a discussion board category
 * 3. Create and authenticate a member
 * 4. Create a parent article for comments
 * 5. Test valid boundary conditions (1 char and 5000 chars)
 * 6. Test invalid boundary conditions (0 chars and 5001 chars)
 */
export async function test_api_comment_creation_text_boundary_validation(
  connection: api.IConnection,
) {
  // 1. Create and authenticate moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorBody = {
    email: moderatorEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderatorAuth: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderatorAuth);

  // 2. Create a discussion board category
  const categoryData = {
    name: "Test Category",
    slug: "test-category",
    description: "Test category for boundary validation",
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // 3. Create and authenticate member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberBody = {
    email: memberEmail,
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(memberAuth);

  // 4. Create a parent article
  const articleBody = {
    title: "Test Article for Comment Boundary Testing",
    body: RandomGenerator.content({ paragraphs: 2 }),
    category_id: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 5. Test valid boundary conditions

  // Test minimum valid: exactly 1 character
  const minCharComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: "x",
          href: "http://localhost/test",
          referrer: "http://localhost",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(minCharComment);
  TestValidator.equals(
    "minimum character comment body is 1 character",
    minCharComment.body,
    "x",
  );

  // Test maximum valid: exactly 5000 characters
  const generatedText = RandomGenerator.paragraph({
    sentences: 500,
    wordMin: 8,
    wordMax: 10,
  });
  const maxCharBody =
    generatedText.length >= 5000
      ? generatedText.substring(0, 5000)
      : generatedText.padEnd(5000, "x");

  const maxCharComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: maxCharBody,
          href: "http://localhost/test",
          referrer: "http://localhost",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(maxCharComment);
  TestValidator.equals(
    "maximum character comment body is 5000 characters",
    maxCharComment.body,
    maxCharBody,
  );

  // 6. Test invalid boundary conditions

  // Test invalid: 0 characters (empty)
  await TestValidator.error("empty comment should fail", async () => {
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          body: "",
          href: "http://localhost/test",
          referrer: "http://localhost",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  });

  // Test invalid: 5001 characters (exceeds maximum)
  const tooLongGenerated = RandomGenerator.paragraph({
    sentences: 600,
    wordMin: 8,
    wordMax: 10,
  });
  const tooLongBody =
    tooLongGenerated.length >= 5001
      ? tooLongGenerated.substring(0, 5001)
      : tooLongGenerated.padEnd(5001, "y");

  await TestValidator.error(
    "comment exceeding 5000 characters should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            body: tooLongBody,
            href: "http://localhost/test",
            referrer: "http://localhost",
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
