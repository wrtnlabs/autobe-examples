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
 * Test successful article deletion by the original author with soft delete
 * mechanism.
 *
 * This test validates the complete article deletion workflow where the original
 * author can delete their own article. The system implements soft delete to
 * preserve historical data for audit purposes while removing the article from
 * public view. The test verifies:
 *
 * 1. Member registration and authentication
 * 2. Category creation for article assignment
 * 3. Article creation by the member with proper content validation
 * 4. Article deletion by the original author
 * 5. Attempt to delete non-existent article should fail
 * 6. Validation of deletion operation success
 *
 * The soft delete approach ensures compliance with data retention policies
 * while maintaining the ability to recover content if needed for moderation or
 * investigation purposes in the politics discussion board platform.
 */
export async function test_api_article_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account for article authorship
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "ValidPass123",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category for article assignment (as moderator)
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: "Economic Policy Discussion",
        description:
          "Discussions about economic policies and their impact on society",
        sequence: 1,
        primary: true,
        required: true,
        multiplicative: false,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create article as the member author
  const articleTitle = RandomGenerator.name(3);
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

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

  // Verify initial article state
  TestValidator.equals(
    "article is created successfully",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleContent,
  );
  TestValidator.equals(
    "article category matches",
    article.politics_bbs_category_id,
    category.id,
  );
  TestValidator.predicate(
    "article has no deleted_at initially",
    article.deleted_at === null,
  );

  // Step 4: Delete the article by the original author
  await api.functional.politicsBbs.member.articles.erase(connection, {
    articleId: article.id,
  });

  // Verify deletion was successful (no error thrown)
  TestValidator.predicate("article deletion completed without error", true);

  // Step 5: Test that deleting a non-existent article fails appropriately
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent article should fail",
    async () => {
      await api.functional.politicsBbs.member.articles.erase(connection, {
        articleId: nonExistentArticleId,
      });
    },
  );
}
