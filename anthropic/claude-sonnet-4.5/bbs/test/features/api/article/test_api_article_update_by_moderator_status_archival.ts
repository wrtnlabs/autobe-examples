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
 * Test moderator's ability to change article publication status from published
 * to archived for content lifecycle management.
 *
 * This scenario creates a category, creates a member who publishes an article,
 * then authenticates as a moderator and updates the article status to
 * 'archived'. The test verifies that the status transition succeeds, the
 * article is no longer publicly visible in normal browsing, and the archived
 * status is properly recorded. This validates moderator control over article
 * lifecycle and content visibility management for guideline enforcement.
 *
 * Test workflow:
 *
 * 1. Create moderator account
 * 2. Create article category as moderator
 * 3. Create member account
 * 4. Switch to member context and create published article
 * 5. Switch back to moderator context
 * 6. Archive the published article
 * 7. Validate status transition and metadata updates
 */
export async function test_api_article_update_by_moderator_status_archival(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!@#";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discussions about political topics and governance",
          sort_order: Math.floor(
            Math.random() * 100,
          ) satisfies number as number,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create published article as member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const publishedArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(publishedArticle);

  // Validate initial article state
  TestValidator.equals(
    "article initially published",
    publishedArticle.status,
    "published",
  );
  TestValidator.equals(
    "article not edited initially",
    publishedArticle.is_edited,
    false,
  );

  // Step 5: Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Archive the article as moderator
  const archivedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: publishedArticle.id,
      body: {
        status: "archived",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(archivedArticle);

  // Step 7: Validate status transition and metadata
  TestValidator.equals(
    "article status changed to archived",
    archivedArticle.status,
    "archived",
  );
  TestValidator.equals(
    "article marked as edited",
    archivedArticle.is_edited,
    true,
  );
  TestValidator.equals(
    "article ID unchanged",
    archivedArticle.id,
    publishedArticle.id,
  );
  TestValidator.equals(
    "article title unchanged",
    archivedArticle.title,
    publishedArticle.title,
  );
  TestValidator.equals(
    "article body unchanged",
    archivedArticle.body,
    publishedArticle.body,
  );

  // Validate that updated_at timestamp has changed
  TestValidator.predicate(
    "updated_at timestamp advanced",
    new Date(archivedArticle.updated_at).getTime() >
      new Date(publishedArticle.updated_at).getTime(),
  );
}
