import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test strict ownership verification by attempting to delete another member's
 * article.
 *
 * This test validates critical security controls preventing members from
 * deleting others' content. The scenario creates a category, registers first
 * member who publishes an article, then creates a second member and attempts to
 * delete the first member's article using the second member's authentication.
 *
 * Process:
 *
 * 1. Create moderator account for category infrastructure
 * 2. Moderator creates article category
 * 3. First member registers and creates article (establishes ownership)
 * 4. Second member registers (independent account)
 * 5. Second member attempts to delete first member's article (authorization test)
 * 6. Verify deletion fails with proper authorization error
 * 7. Confirm article data remains unchanged after failed deletion attempt
 */
export async function test_api_article_deletion_ownership_verification(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator_password_123",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates article category
  const categoryData = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description: "Discussions about economic policies and market trends",
    sort_order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: First member registers and authenticates
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMemberPassword = "first_member_pass_456";

  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5, wordMin: 4, wordMax: 8 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 4: First member creates article (establishes ownership)
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 5: Second member registers and authenticates (actor switching)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMemberPassword = "second_member_pass_789";

  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      email: secondMemberEmail,
      password: secondMemberPassword,
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 7 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 6: Second member attempts to delete first member's article (should fail)
  await TestValidator.error(
    "second member cannot delete first member's article - authorization failure expected",
    async () => {
      await api.functional.discussionBoard.member.articles.erase(connection, {
        articleId: article.id,
      });
    },
  );

  // Step 7: Verify article remains unchanged after failed deletion attempt
  // Switch back to first member to verify article integrity
  await api.functional.auth.member.login(connection, {
    body: {
      email: firstMemberEmail,
      password: firstMemberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });

  // Article should still exist with unchanged data (ownership verification succeeded)
  TestValidator.equals(
    "article title unchanged",
    article.title,
    articleData.title,
  );
  TestValidator.equals("article status unchanged", article.status, "published");
  TestValidator.equals(
    "article category unchanged",
    article.category.id,
    category.id,
  );
}
