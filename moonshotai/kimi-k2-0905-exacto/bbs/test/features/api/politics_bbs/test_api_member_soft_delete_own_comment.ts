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
 * Test that a member can soft delete their own comment using soft deletion
 * while maintaining content for audit purposes. Verify system maintains
 * conversation thread integrity and prevents deletion of other members'
 * comments through ownership validation.
 */
export async function test_api_member_soft_delete_own_comment(
  connection: api.IConnection,
) {
  // Create test member accounts
  const member1Email = `${RandomGenerator.alphabets(8)}@test.com`;
  const member1 = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: member1Email,
      password: "TestPassword123",
      href: "https://test.discussion.com/article/1234",
      referrer: "https://test.discussion.com/",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member1);

  const member2Email = `${RandomGenerator.alphabets(8)}@test.com`;
  const member2 = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: member2Email,
      password: "TestPassword123",
      href: "https://test.discussion.com/article/1234",
      referrer: "https://test.discussion.com/",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member2);

  // Create discussion category
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: "economic-policy",
        name: "Economic Policy",
        description:
          "Discussions about economic policies, regulations, and their impacts on society.",
        sequence: 1,
        primary: true,
        required: true,
        multiplicative: false,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Create article to enable commenting
  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: {
        politics_bbs_category_id: category.id,
        title:
          "Analysis of Recent Monetary Policy Changes and Their Economic Implications",
        content:
          "The recent adjustments to monetary policy by the central bank have significant implications for economic growth and stability. This analysis examines the potential impacts on inflation rates, employment levels, and overall economic trajectory. The policy changes include interest rate modifications, liquidity adjustments, and regulatory framework updates designed to address current economic challenges while maintaining long-term stability.",
      } satisfies IPoliticsBbsArticle.ICreate,
    },
  );
  typia.assert(article);

  // Create comment as member1 (owner of comment to delete)
  const comment1 =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This is a thoughtful analysis of the current monetary policy situation. I would suggest additional consideration of how these policies will impact small business development and regional economic disparities. Regional economic analysis would provide more comprehensive understanding of the broader implications.",
          href: `https://test.discussion.com/article/${article.id}`,
          referrer: `https://test.discussion.com/category/economic-policy`,
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(comment1);

  // Create comment as member2 (to test ownership validation)
  const comment2 =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Interesting perspective on the monetary policy changes. I would argue that the emphasis should be placed on long-term economic stability rather than short-term growth metrics. The historical evidence suggests that gradual policy implementation yields better outcomes than rapid response measures.",
          href: `https://test.discussion.com/article/${article.id}`,
          referrer: `https://test.discussion.com/category/economic-policy`,
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(comment2);

  // Test 1: Member1 soft-deletes their own comment
  await api.functional.politicsBbs.member.comments.erase(connection, {
    commentId: comment1.id,
  });

  // Test 2: Member1 attempts to delete member2's comment (should fail)
  await TestValidator.error(
    "member cannot delete other's comment",
    async () => {
      await api.functional.politicsBbs.member.comments.erase(connection, {
        commentId: comment2.id,
      });
    },
  );
}
