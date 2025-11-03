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
 * Test that members cannot delete articles created by other members.
 *
 * This test validates the system's article ownership validation by:
 *
 * 1. Creating a first member account and authenticating
 * 2. Creating a second member account separately
 * 3. Having the first member create an article with proper content
 * 4. Verifying the second member cannot delete the first member's article
 * 5. Confirming proper error handling and ownership rights protection
 *
 * The test ensures that article deletion operations respect content ownership
 * and prevents unauthorized content removal in the politicsBBS platform.
 */
export async function test_api_article_delete_unauthorized(
  connection: api.IConnection,
) {
  // Create first member account who will create the article
  const firstMemberUsername = `testuser_${RandomGenerator.alphabets(8)}`;
  const firstMember = await api.functional.auth.members.join(connection, {
    body: {
      username: firstMemberUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(firstMember);

  // Store the JWT token automatically set by the SDK
  const jwtAuthConnection: api.IConnection = { ...connection };

  // Create category for article assignment
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: `category_${RandomGenerator.alphabets(6)}`,
        name: RandomGenerator.name(2),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sequence: typia.random<number & tags.Type<"int32">>(),
        primary: false,
        required: true,
        multiplicative: false,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Have first member create an article
  const originalArticle =
    await api.functional.politicsBbs.member.articles.create(jwtAuthConnection, {
      body: {
        politics_bbs_category_id: category.id,
        title: RandomGenerator.name(4),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    });
  typia.assert(originalArticle);

  // Create second member account for unauthorized deletion attempt
  await api.functional.auth.members.join(connection, {
    body: {
      username: `anotheruser_${RandomGenerator.alphabets(8)}`,
      email: typia.random<string & tags.Format<"email">>(),
      password: "AnotherPass123",
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  // Store the JWT token automatically set by the SDK
  const secondMemberConnection: api.IConnection = { ...connection };

  // Verify second member cannot delete the first member's article
  await TestValidator.error(
    "second member cannot delete first member's article",
    async () => {
      await api.functional.politicsBbs.member.articles.erase(
        secondMemberConnection,
        {
          articleId: originalArticle.id,
        },
      );
    },
  );
}
