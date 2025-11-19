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
 * Test reverting a published article back to draft status.
 *
 * This test validates that members can unpublish articles by changing status
 * from 'published' to 'draft', effectively removing them from public visibility
 * while preserving content and publication history. The published_at timestamp
 * must be retained to maintain publication history.
 *
 * Test Steps:
 *
 * 1. Create moderator account and article category
 * 2. Create member account (article author)
 * 3. Create and publish an article with status 'published'
 * 4. Verify article is published with published_at timestamp
 * 5. Update article status from 'published' to 'draft'
 * 6. Validate status change, published_at retention, and is_edited flag
 * 7. Verify updated_at timestamp has changed
 */
export async function test_api_article_update_published_to_draft(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "moderator123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/moderator/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create article category as moderator
  const categoryData = {
    name: "Economic Discussion",
    slug: "economic-discussion",
    description: "Articles about economic topics and policies",
    sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 3: Create member account (article author)
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "member123!",
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/member/join" satisfies string &
      tags.Format<"uri">,
    referrer: "https://example.com" satisfies string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create and publish an article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    discussion_board_article_category_id: category.id,
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;

  const publishedArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(publishedArticle);

  // Step 5: Verify article is published with published_at timestamp
  TestValidator.equals(
    "article status is published",
    publishedArticle.status,
    "published",
  );
  TestValidator.predicate(
    "published_at timestamp is set",
    publishedArticle.published_at !== null &&
      publishedArticle.published_at !== undefined,
  );
  TestValidator.equals(
    "is_edited flag is initially false",
    publishedArticle.is_edited,
    false,
  );

  // Store original timestamps for comparison
  const originalPublishedAt = publishedArticle.published_at;
  const originalUpdatedAt = publishedArticle.updated_at;

  // Step 6: Update article status from 'published' to 'draft'
  const updateData = {
    status: "draft" as const,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const draftArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: publishedArticle.id,
      body: updateData,
    });
  typia.assert(draftArticle);

  // Step 7: Validate status change and published_at retention
  TestValidator.equals(
    "article status changed to draft",
    draftArticle.status,
    "draft",
  );
  TestValidator.equals(
    "published_at timestamp is retained",
    draftArticle.published_at,
    originalPublishedAt,
  );
  TestValidator.predicate(
    "published_at is not null after unpublishing",
    draftArticle.published_at !== null &&
      draftArticle.published_at !== undefined,
  );
  TestValidator.equals(
    "is_edited flag is set to true",
    draftArticle.is_edited,
    true,
  );
  TestValidator.notEquals(
    "updated_at timestamp has changed",
    draftArticle.updated_at,
    originalUpdatedAt,
  );

  // Step 8: Verify article ID and other properties remain unchanged
  TestValidator.equals(
    "article ID remains the same",
    draftArticle.id,
    publishedArticle.id,
  );
  TestValidator.equals(
    "article title remains the same",
    draftArticle.title,
    publishedArticle.title,
  );
  TestValidator.equals(
    "article body remains the same",
    draftArticle.body,
    publishedArticle.body,
  );
  TestValidator.equals(
    "article category remains the same",
    draftArticle.category.id,
    publishedArticle.category.id,
  );
}
