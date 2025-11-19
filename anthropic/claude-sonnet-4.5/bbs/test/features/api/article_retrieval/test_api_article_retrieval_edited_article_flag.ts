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
 * Test that the is_edited flag correctly reflects article edit history and
 * provides transparency about content revisions.
 *
 * This test validates the article editing workflow and the is_edited flag
 * behavior:
 *
 * 1. Create member account and category
 * 2. Create and publish an initial article
 * 3. Retrieve article and verify is_edited is false for newly published content
 * 4. Update the article content (title or body)
 * 5. Retrieve the updated article
 * 6. Validate is_edited flag is now true
 * 7. Verify updated_at timestamp changed
 * 8. Confirm is_edited remains true on subsequent retrievals
 * 9. Validate transparency about content modifications to readers
 */
export async function test_api_article_retrieval_edited_article_flag(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >() satisfies number as number,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for article authoring
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "member123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create and publish initial article
  const originalTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: originalTitle,
        body: originalBody,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 5: Retrieve article and verify is_edited is false for newly published content
  const initialArticle = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
  typia.assert(initialArticle);

  TestValidator.equals(
    "article ID matches",
    initialArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "is_edited should be false for new article",
    initialArticle.is_edited,
    false,
  );

  // Store original updated_at timestamp
  const originalUpdatedAt = initialArticle.updated_at;

  // Step 6: Update the article content to trigger is_edited flag
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 12,
    sentenceMax: 20,
  });

  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(updatedArticle);

  // Step 7: Validate is_edited flag is now true after update
  TestValidator.equals(
    "is_edited should be true after update",
    updatedArticle.is_edited,
    true,
  );

  // Step 8: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at should change after edit",
    updatedArticle.updated_at,
    originalUpdatedAt,
  );

  // Step 9: Retrieve the article again to confirm is_edited remains true
  const retrievedAgain = await api.functional.discussionBoard.articles.at(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
  typia.assert(retrievedAgain);

  TestValidator.equals(
    "is_edited remains true on subsequent retrieval",
    retrievedAgain.is_edited,
    true,
  );
  TestValidator.equals(
    "updated content title matches",
    retrievedAgain.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated content body matches",
    retrievedAgain.body,
    updatedBody,
  );
}
