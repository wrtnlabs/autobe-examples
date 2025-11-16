import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test article creation with rich text formatting in the body content.
 *
 * This scenario validates that the discussion board system properly accepts and
 * preserves rich text formatting including paragraphs, line breaks, and special
 * characters commonly used in economic and political discussions.
 *
 * Test workflow:
 *
 * 1. Register and authenticate as a member
 * 2. Create an article with rich text formatted body content
 * 3. Validate that formatting is preserved in the response
 * 4. Verify all article metadata is correctly populated
 */
export async function test_api_article_creation_with_rich_text_formatting(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";
  const memberUsername = RandomGenerator.name(2);

  const authenticatedMember = await api.functional.auth.member.join(
    connection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: memberUsername,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(authenticatedMember);

  // Step 2: Create article with rich text formatted body content
  // Generate multi-paragraph content with line breaks and special characters
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  // Create rich text body with multiple paragraphs, line breaks, and special characters
  const paragraph1 = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 4,
    wordMax: 10,
  });
  const paragraph2 = RandomGenerator.paragraph({
    sentences: 20,
    wordMin: 5,
    wordMax: 12,
  });
  const paragraph3 = RandomGenerator.paragraph({
    sentences: 18,
    wordMin: 3,
    wordMax: 9,
  });

  // Include special characters and formatting
  const richTextBody = `${paragraph1}\n\n${paragraph2}\n\n${paragraph3}\n\nSpecial characters: @#$%^&*()_+-={}[]|:;"'<>,.?/~\`\n\nFormatted discussion points:\n- Economic analysis with data\n- Political implications & consequences\n- Historical context (1990-2024)\n\nConclusion with "quoted text" and 'single quotes'.`;

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: richTextBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Validate article content and metadata
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body preserves formatting",
    createdArticle.body,
    richTextBody,
  );
  TestValidator.equals(
    "view count initialized to zero",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "article is not deleted",
    createdArticle.deleted_at,
    null,
  );

  // Verify author information matches authenticated member
  TestValidator.equals(
    "author ID matches member",
    createdArticle.author.id,
    authenticatedMember.id,
  );
  TestValidator.equals(
    "author username matches",
    createdArticle.author.username,
    memberUsername,
  );
  TestValidator.equals(
    "author email matches",
    createdArticle.author.email,
    memberEmail,
  );
}
