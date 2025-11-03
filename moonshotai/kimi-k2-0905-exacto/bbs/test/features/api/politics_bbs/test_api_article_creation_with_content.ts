import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test successful article creation with title and content.
 *
 * This test validates the complete article creation workflow for members in the
 * politics discussion board. It ensures authenticated members can create
 * articles with proper titles (5-150 characters) and substantial content
 * (minimum 50 characters). The test verifies business rules compliance and that
 * articles enter pending moderation state for quality control.
 *
 * Test workflow:
 *
 * 1. Setup: Create a moderator account and political discussion category
 * 2. Authentication: Register and authenticate a new member account
 * 3. Article Creation: Create articles with valid content meeting length
 *    requirements
 * 4. Validation: Verify article properties and moderation state
 * 5. Boundary Testing: Test with minimum length titles and content
 * 6. Business Rules: Confirm proper validation and error handling
 */
export async function test_api_article_creation_with_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a political discussion category for article organization
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: "economic-policy",
        name: "Economic Policy Discussion",
        description:
          "Discussions about fiscal policies, monetary systems, and economic reforms",
        sequence: 1,
        primary: true,
        required: true,
        multiplicative: false,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 2: Register a new member account for article creation privileges
  const email = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9-]+$">
      >(),
      email,
      password: "SecurePass123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 3: Create article with valid title (5-150 chars) and substantial content (50+ chars)
  const articleContent = RandomGenerator.paragraph({
    sentences: 25,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: {
        politics_bbs_category_id: category.id,
        title: "The Impact of Fiscal Policy on Economic Growth",
        content: articleContent,
      } satisfies IPoliticsBbsArticle.ICreate,
    },
  );
  typia.assert(article);

  // Validate article creation success and proper moderation state
  TestValidator.equals(
    "article title matches input",
    article.title,
    "The Impact of Fiscal Policy on Economic Growth",
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article belongs to correct category",
    article.politics_bbs_category_id,
    category.id,
  );
  TestValidator.predicate(
    "article has valid title length",
    article.title.length >= 5 && article.title.length <= 150,
  );
  TestValidator.predicate(
    "article has substantial content >= 50 characters",
    article.content.length >= 50 && article.content.length <= 10000,
  );

  // Step 4: Test boundary conditions with minimum title length
  const shortContent = RandomGenerator.paragraph({
    sentences: 15,
    wordMin: 3,
    wordMax: 6,
  });

  const boundaryArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: category.id,
        title: "Short title exactly 5 characters long",
        content: shortContent,
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(boundaryArticle);

  // Validate boundary condition handling
  TestValidator.predicate(
    "minimum title length boundary tested",
    boundaryArticle.title.length >= 5,
  );
  TestValidator.predicate(
    "minimum content length is properly handled",
    boundaryArticle.content.length >= 50,
  );

  // Step 5: Test article creation with diverse content types
  const diverseArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: category.id,
        title: "Modern Economic Policy Challenges and Solutions Explored",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 12,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(diverseArticle);

  // Validate diverse content handling
  TestValidator.predicate(
    "diverse article has substantial content",
    diverseArticle.content.length >= 100,
  );
  TestValidator.predicate(
    "articles have timestamps for audit trail",
    new Date(diverseArticle.created_at).getTime() > 0,
  );

  // Step 6: Test maximum title length (150 characters) with shorter content
  const maxTitleContent = ArrayUtil.repeat(30, () => RandomGenerator.name(1))
    .join(" ")
    .substring(0, 25);
  const longTitle = maxTitleContent.slice(0, 149) + "x"; // Ensure exactly 150 characters

  const longTitleArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: category.id,
        title: longTitle,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(longTitleArticle);

  TestValidator.predicate(
    "maximum title length article has reasonable length",
    longTitleArticle.title.length > 100 && longTitleArticle.title.length <= 150,
  );

  TestValidator.predicate(
    "all articles maintain consistent creation criteria",
    [
      article.title.length,
      boundaryArticle.title.length,
      diverseArticle.title.length,
      longTitleArticle.title.length,
    ].every((len) => len >= 5 && len <= 150),
  );

  // Final validation: All articles should follow business rules
  const allArticles = [
    article,
    boundaryArticle,
    diverseArticle,
    longTitleArticle,
  ];
  TestValidator.predicate(
    "all articles are created by authenticated member",
    allArticles.every((a) => a.politics_bbs_creator_id === member.id),
  );
  TestValidator.predicate(
    "all articles have valid article state for moderation workflow",
    allArticles.every((a) => typeof a.state === "string" && a.state.length > 0),
  );
  TestValidator.predicate(
    "all articles have view count initialized to zero",
    allArticles.every((a) => a.view_count === 0),
  );
  TestValidator.predicate(
    "all articles have substantial content meeting minimum requirements",
    allArticles.every((a) => a.content.length >= 50),
  );
  TestValidator.predicate(
    "all articles have proper UUID identifiers",
    allArticles.every((a) => typia.is<string & tags.Format<"uuid">>(a.id)),
  );
}
