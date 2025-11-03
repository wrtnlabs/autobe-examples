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
 * Test successful article creation by authenticated member with title, content,
 * and category assignment.
 *
 * This test validates the complete article creation workflow for members
 * including:
 *
 * - Member registration and authentication
 * - Category creation (moderator dependency)
 * - Article creation with title/content validation (5-150 chars title, 50+ chars
 *   content)
 * - Business rule enforcement and state management
 * - Category assignment and article metadata
 *
 * The test ensures all validation constraints are properly enforced and
 * articles are created in the appropriate state for the politics discussion
 * board platform.
 */
export async function test_api_article_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const username = RandomGenerator.name();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username,
      email: memberEmail,
      password: "ValidPassword123",
      ip: "127.0.0.1",
      href: "https://example.com/politics-bbs",
      referrer: "https://example.com/",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category for article assignment (moderator dependency)
  const categoryCode = `category-${RandomGenerator.alphabets(8)}`;
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: categoryCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        color: "#1E88E5",
        icon: "fas fa-users",
        sequence: 1,
        primary: true,
        required: true,
        multiplicative: false,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create article with valid title and content
  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  TestValidator.predicate(
    "article title should be 5-150 characters",
    articleTitle.length >= 5 && articleTitle.length <= 150,
  );

  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });
  TestValidator.predicate(
    "article content should be minimum 50 characters",
    articleContent.length >= 50,
  );

  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: {
        politics_bbs_category_id: category.id,
        title: articleTitle,
        content: articleContent,
      } satisfies IPoliticsBbsArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Validate article creation
  TestValidator.equals(
    "article has correct category",
    article.politics_bbs_category_id,
    category.id,
  );
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleContent,
  );

  // Validate article state (should be pending for new articles)
  TestValidator.predicate(
    "article should be in pending state",
    article.state === "pending",
  );

  // Validate initial view count
  TestValidator.equals("article view count starts at 0", article.view_count, 0);

  // Validate creator relationship matches member
  TestValidator.equals(
    "article creator ID matches member",
    article.politics_bbs_creator_id,
    member.id,
  );

  // Validate category relationship is properly set
  TestValidator.predicate(
    "article has associated category",
    article.category !== undefined,
  );
  TestValidator.equals(
    "category ID matches",
    article.category?.id,
    category.id,
  );

  // Step 5: Test business rule validation
  // Try creating article with invalid title length
  const shortTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 3,
  });
  TestValidator.predicate(
    "short title should be less than 5 characters",
    shortTitle.length < 5,
  );

  await TestValidator.error(
    "article creation should fail with title too short",
    async () => {
      await api.functional.politicsBbs.member.articles.create(connection, {
        body: {
          politics_bbs_category_id: category.id,
          title: shortTitle,
          content: articleContent,
        } satisfies IPoliticsBbsArticle.ICreate,
      });
    },
  );

  // Try creating article with content too short
  const shortContent = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  TestValidator.predicate(
    "short content should be less than 50 characters",
    shortContent.length < 50,
  );

  await TestValidator.error(
    "article creation should fail with content too short",
    async () => {
      await api.functional.politicsBbs.member.articles.create(connection, {
        body: {
          politics_bbs_category_id: category.id,
          title: articleTitle,
          content: shortContent,
        } satisfies IPoliticsBbsArticle.ICreate,
      });
    },
  );

  // Step 6: Validate article structure and relationships
  TestValidator.predicate(
    "article should have snapshots array",
    Array.isArray(article.snapshots),
  );
  TestValidator.equals(
    "article should start with one snapshot",
    article.snapshots?.length,
    1,
  );

  if (article.snapshots && article.snapshots.length > 0) {
    const snapshot = article.snapshots[0];
    TestValidator.equals(
      "snapshot title matches article",
      snapshot.title,
      articleTitle,
    );
    TestValidator.equals(
      "snapshot content matches article",
      snapshot.content,
      articleContent,
    );
    TestValidator.equals(
      "snapshot state matches article",
      snapshot.state,
      article.state,
    );
    TestValidator.equals("snapshot view count matches", snapshot.view_count, 0);
  }
}
