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
 * Test moderator's ability to update a draft article to published status,
 * triggering the published_at timestamp assignment.
 *
 * This scenario creates a category, creates a member who saves an article as
 * draft (status='draft', published_at=null), then authenticates as a moderator
 * and updates the article status to 'published'. The test verifies that the
 * status transition succeeds, the published_at timestamp is set to the current
 * time (previously null), and the article becomes publicly visible. This
 * validates the publication workflow and published_at timestamp logic when
 * transitioning from draft to published state.
 *
 * Workflow:
 *
 * 1. Create and authenticate as moderator
 * 2. Create article category
 * 3. Create and authenticate as member
 * 4. Member creates draft article
 * 5. Switch back to moderator authentication
 * 6. Moderator publishes the draft article
 * 7. Validate status transition and timestamp assignment
 */
export async function test_api_article_update_by_moderator_draft_to_published(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create category for article classification
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Discussion",
          slug: "political-discussion",
          description: "Discussions about political topics and governance",
          sort_order: 1,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates draft article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 10,
  });

  const draftArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        discussion_board_article_category_id: category.id,
        status: "draft",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(draftArticle);

  // Validate draft article initial state
  TestValidator.equals(
    "draft article status should be draft",
    draftArticle.status,
    "draft",
  );
  TestValidator.equals(
    "draft article published_at should be null",
    draftArticle.published_at,
    null,
  );

  // Step 5: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "127.0.0.1",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 6: Moderator publishes the draft article
  const publishedArticle =
    await api.functional.discussionBoard.moderator.articles.update(connection, {
      articleId: draftArticle.id,
      body: {
        status: "published",
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(publishedArticle);

  // Step 7: Validate status transition and timestamp assignment
  TestValidator.equals(
    "article status should be published",
    publishedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published_at timestamp should be set",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );

  // Validate article data integrity
  TestValidator.equals(
    "article title preserved",
    publishedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body preserved",
    publishedArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article category preserved",
    publishedArticle.category.id,
    category.id,
  );
  TestValidator.equals(
    "article ID unchanged",
    publishedArticle.id,
    draftArticle.id,
  );
}
