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
 * Test that a member can reply to existing comments supporting nested threading
 * up to 3 levels deep. Verify proper nesting level calculation, parent comment
 * relationships, and that system enforces maximum nesting depth while
 * maintaining conversation flow for political discourse discussions.
 *
 * 1. Create member account for comment threading
 * 2. Create category for article organization
 * 3. Create article for comment threads
 * 4. Create parent comment (level 0 - top level)
 * 5. Reply to parent comment (level 1)
 * 6. Reply to level 1 comment (level 2)
 * 7. Reply to level 2 comment (level 3 - maximum depth)
 * 8. Verify all nesting levels and parent relationships
 * 9. Verify comment depth cannot exceed 3 levels
 */
export async function test_api_member_comment_threading_support(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const member = await api.functional.auth.members.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/signup",
      referrer: "https://example.com/home",
    } satisfies IPoliticsBbsMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create category
  const category = await api.functional.politicsBbs.moderator.categories.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(10),
        name: "Political Analysis",
        description: "In-depth analysis of political events and policies",
        sequence: 1,
        primary: true,
        required: false,
        multiplicative: true,
      } satisfies IPoliticsBbsCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Create article
  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: {
        politics_bbs_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
      } satisfies IPoliticsBbsArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 4: Create parent comment (level 0 - top level)
  const parentComment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This is a comprehensive analysis of the current political situation. I believe the proposed policy changes could have significant impacts on economic growth and social stability.",
          href: `https://example.com/articles/${article.id}`,
          referrer: "https://example.com/categories/political-analysis",
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(parentComment);

  TestValidator.equals("parent comment depth is 0", parentComment.depth, 0);
  TestValidator.equals(
    "parent comment parent_id is null",
    parentComment.parent_id,
    null,
  );

  // Step 5: Reply to parent comment (level 1)
  const level1Comment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I agree with your assessment. The economic implications are particularly concerning given the current market conditions and international trade relationships.",
          parent_id: parentComment.id,
          href: `https://example.com/articles/${article.id}`,
          referrer: `https://example.com/articles/${article.id}`,
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(level1Comment);

  TestValidator.equals("level 1 comment depth is 1", level1Comment.depth, 1);
  TestValidator.equals(
    "level 1 comment parent_id matches parent",
    level1Comment.parent_id,
    parentComment.id,
  );

  // Step 6: Reply to level 1 comment (level 2)
  const level2Comment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Indeed, the trade relationship complexities add another layer of difficulty. Have you considered how this might affect small businesses and local economies?",
          parent_id: level1Comment.id,
          href: `https://example.com/articles/${article.id}`,
          referrer: `https://example.com/articles/${article.id}`,
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(level2Comment);

  TestValidator.equals("level 2 comment depth is 2", level2Comment.depth, 2);
  TestValidator.equals(
    "level 2 comment parent_id matches level 1",
    level2Comment.parent_id,
    level1Comment.id,
  );

  // Step 7: Reply to level 2 comment (level 3 - maximum depth)
  const level3Comment =
    await api.functional.politicsBbs.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "Small businesses would likely face increased regulatory compliance costs, but the infrastructure investments could create new opportunities in the long term. It's a complex balancing act.",
          parent_id: level2Comment.id,
          href: `https://example.com/articles/${article.id}`,
          referrer: `https://example.com/articles/${article.id}`,
        } satisfies IPoliticsBbsComment.ICreate,
      },
    );
  typia.assert(level3Comment);

  TestValidator.equals("level 3 comment depth is 3", level3Comment.depth, 3);
  TestValidator.equals(
    "level 3 comment parent_id matches level 2",
    level3Comment.parent_id,
    level2Comment.id,
  );

  // Step 8: Verify all nesting levels and relationships
  TestValidator.predicate(
    "all comments have increasing depth",
    level1Comment.depth > parentComment.depth &&
      level2Comment.depth > level1Comment.depth &&
      level3Comment.depth > level2Comment.depth,
  );

  TestValidator.predicate(
    "parent relationships form proper chain",
    level1Comment.parent_id === parentComment.id &&
      level2Comment.parent_id === level1Comment.id &&
      level3Comment.parent_id === level2Comment.id,
  );

  TestValidator.predicate(
    "all comments belong to same article",
    parentComment.politics_bbs_article_id === article.id &&
      level1Comment.politics_bbs_article_id === article.id &&
      level2Comment.politics_bbs_article_id === article.id &&
      level3Comment.politics_bbs_article_id === article.id,
  );

  // Step 9: Test that exceeding maximum depth (4 levels) is prevented
  await TestValidator.error(
    "cannot create comment exceeding maximum depth of 3",
    async () => {
      await api.functional.politicsBbs.member.articles.comments.create(
        connection,
        {
          articleId: article.id,
          body: {
            content:
              "This should fail as we're attempting to create a level 4 comment beyond the maximum allowed depth.",
            parent_id: level3Comment.id,
            href: `https://example.com/articles/${article.id}`,
            referrer: `https://example.com/articles/${article.id}`,
          } satisfies IPoliticsBbsComment.ICreate,
        },
      );
    },
  );
}
