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
 * Test successful article update by original author within 24-hour window.
 *
 * This test validates the complete article update workflow:
 *
 * 1. Register member account for article ownership
 * 2. Create category via moderator API for article classification
 * 3. Create original article with proper content
 * 4. Update article by original author (within 24h editing window)
 * 5. Validate updated content and audit snapshot creation
 *
 * System enforces 24-hour editing restriction and maintains content history
 * through snapshot mechanism for audit trail and accountability.
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123",
      href: "https://politicsbbs.example.com",
      referrer: "https://politicsbbs.example.com/join",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category for article
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 10,
          wordMin: 4,
          wordMax: 8,
        }),
        sequence: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        primary: RandomGenerator.pick([true, false]),
        required: RandomGenerator.pick([true, false]),
        multiplicative: RandomGenerator.pick([true, false]),
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create original article
  const originalArticle =
    await api.functional.politicsBbs.member.articles.create(connection, {
      body: {
        politics_bbs_category_id: category.id,
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(originalArticle);

  // Verify article creation success
  TestValidator.equals(
    "article category matches",
    originalArticle.politics_bbs_category_id,
    category.id,
  );
  TestValidator.predicate(
    "article has creator ID",
    originalArticle.politics_bbs_creator_id !== null,
  );
  TestValidator.predicate(
    "title length valid",
    originalArticle.title.length >= 5 && originalArticle.title.length <= 150,
  );
  TestValidator.predicate(
    "content length valid",
    originalArticle.content.length >= 50 &&
      originalArticle.content.length <= 10000,
  );

  // Step 4: Create different category for update test
  const newCategory =
    await api.functional.politicsBbs.moderator.categories.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 8,
          wordMin: 4,
          wordMax: 8,
        }),
        sequence: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        primary: RandomGenerator.pick([true, false]),
        required: RandomGenerator.pick([true, false]),
        multiplicative: RandomGenerator.pick([true, false]),
      } satisfies IPoliticsBbsCategory.ICreate,
    });
  typia.assert(newCategory);

  // Step 5: Update article by original author
  const updatedArticle =
    await api.functional.politicsBbs.member.articles.update(connection, {
      articleId: originalArticle.id,
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({
          paragraphs: 4,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 3,
          wordMax: 6,
        }),
        politics_bbs_category_id: newCategory.id,
      } satisfies IPoliticsBbsArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 6: Validate update success
  TestValidator.equals(
    "article ID unchanged",
    updatedArticle.id,
    originalArticle.id,
  );
  TestValidator.notEquals(
    "title changed",
    updatedArticle.title,
    originalArticle.title,
  );
  TestValidator.notEquals(
    "content changed",
    updatedArticle.content,
    originalArticle.content,
  );
  TestValidator.equals(
    "category updated",
    updatedArticle.politics_bbs_category_id,
    newCategory.id,
  );
  TestValidator.equals(
    "category matches new category",
    updatedArticle.politics_bbs_category_id,
    newCategory.id,
  );
  TestValidator.equals(
    "updated_at changed",
    updatedArticle.updated_at !== originalArticle.updated_at,
    true,
  );

  // Step 7: Validate snapshots for audit trail
  if (updatedArticle.snapshots && updatedArticle.snapshots.length > 0) {
    TestValidator.predicate(
      "snapshots maintain history",
      updatedArticle.snapshots.length > 0,
    );

    const latestSnapshot =
      updatedArticle.snapshots[updatedArticle.snapshots.length - 1];
    TestValidator.equals(
      "snapshot preserves original content",
      latestSnapshot.content,
      originalArticle.content,
    );
    TestValidator.equals(
      "snapshot preserves original title",
      latestSnapshot.title,
      originalArticle.title,
    );
    TestValidator.equals(
      "snapshot article ID matches",
      latestSnapshot.politics_bbs_article_id,
      originalArticle.id,
    );
    TestValidator.predicate(
      "snapshot has timestamp",
      latestSnapshot.created_at !== null,
    );
  }
}
