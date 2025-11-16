import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test basic member article creation with required fields including title,
 * content, and categories.
 *
 * This test validates the core content creation functionality for economic
 * discussion board members. The complete workflow involves:
 *
 * 1. Creating a moderator account to establish categories
 * 2. Creating member account for article publishing
 * 3. Moderator creates economic discussion categories
 * 4. Member creates article with title, content, and category assignments
 * 5. Verify article creation with automatic field initialization
 *
 * The test ensures proper moderation workflow establishment, member
 * authentication, and article creation with all required fields meeting
 * platform guidelines.
 */
export async function test_api_member_article_creation_basic(
  connection: api.IConnection,
) {
  // 1. Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(12),
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Create member account for article creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // 3. Moderator creates economic discussion categories
  const economicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "economics",
          name: "Economics",
          description: "General economic discussions and analysis",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(economicsCategory);

  const politicsCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "politics",
          name: "Politics",
          description: "Political discussions and policy analysis",
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  // 4. Member creates article with title, content, and categories
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [economicsCategory.id, politicsCategory.id],
    attachments: [],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // 5. Verify article creation with automatic field initialization
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleData.content,
  );
  TestValidator.equals(
    "article has correct categories count",
    article.categories.length,
    articleData.category_ids.length,
  );
  TestValidator.equals("article version initializes to 0", article.version, 0);
  TestValidator.equals("article status is pending", article.status, "pending");
  TestValidator.equals(
    "article view count initializes to 0",
    article.view_count,
    0,
  );
  TestValidator.predicate(
    "article has created_at timestamp",
    article.created_at !== null && article.created_at !== undefined,
  );
  TestValidator.predicate(
    "article has updated_at timestamp",
    article.updated_at !== null && article.updated_at !== undefined,
  );

  // Verify member author relationship
  TestValidator.equals(
    "article has member author ID",
    article.member_author,
    member.member.id,
  );
  TestValidator.equals(
    "article member profile username matches",
    article.member_author_profile?.username,
    member.member.username,
  );
  TestValidator.equals(
    "article has no moderator author",
    article.moderator_author,
    null,
  );
  TestValidator.equals(
    "article has no moderator profile",
    article.moderator_author_profile,
    undefined,
  );
}
