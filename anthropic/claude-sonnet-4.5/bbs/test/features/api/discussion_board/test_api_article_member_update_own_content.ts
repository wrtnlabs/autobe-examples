import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that a member can successfully update their own article content.
 *
 * This test validates ownership-based authorization by ensuring members can
 * modify articles they created. It verifies that content fields (title, body)
 * are updateable while system fields remain protected. The test confirms that
 * updated_at timestamp is refreshed while created_at remains immutable, and
 * that author information and system metadata stay unchanged.
 *
 * Workflow:
 *
 * 1. Create and authenticate member account
 * 2. Member creates initial article with title and body
 * 3. Same member updates the article with new content
 * 4. Verify article content is updated correctly
 * 5. Verify updated_at timestamp is refreshed
 * 6. Verify created_at timestamp remains unchanged
 * 7. Verify author information remains the same
 * 8. Verify system metadata (id, view_count) is unchanged
 */
export async function test_api_article_member_update_own_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Member creates initial article
  const initialTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const initialBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const initialArticleData = {
    title: initialTitle,
    body: initialBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: initialArticleData,
    });
  typia.assert(createdArticle);

  // Capture original values for comparison
  const originalCreatedAt = createdArticle.created_at;
  const originalUpdatedAt = createdArticle.updated_at;
  const originalAuthorId = createdArticle.author.id;
  const originalArticleId = createdArticle.id;
  const originalViewCount = createdArticle.view_count;

  // Wait a brief moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 3: Update the article with new content
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const updatedBody = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 5,
    wordMax: 9,
  });

  const updateData = {
    title: updatedTitle,
    body: updatedBody,
  } satisfies IDiscussionBoardArticle.IUpdate;

  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: createdArticle.id,
      body: updateData,
    });
  typia.assert(updatedArticle);

  // Step 4: Verify article content is updated correctly
  TestValidator.equals(
    "updated title matches new value",
    updatedArticle.title,
    updatedTitle,
  );
  TestValidator.equals(
    "updated body matches new value",
    updatedArticle.body,
    updatedBody,
  );

  // Step 5: Verify updated_at timestamp is refreshed
  TestValidator.predicate(
    "updated_at timestamp is refreshed after update",
    new Date(updatedArticle.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // Step 6: Verify created_at timestamp remains unchanged (immutable)
  TestValidator.equals(
    "created_at remains unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );

  // Step 7: Verify author information remains the same
  TestValidator.equals(
    "author ID remains unchanged",
    updatedArticle.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "author is the member who created article",
    updatedArticle.author.id,
    member.id,
  );

  // Step 8: Verify system metadata (id, view_count) remains unchanged
  TestValidator.equals(
    "article ID remains unchanged",
    updatedArticle.id,
    originalArticleId,
  );
  TestValidator.equals(
    "view count remains unchanged",
    updatedArticle.view_count,
    originalViewCount,
  );

  // Verify content constraints are met
  TestValidator.predicate(
    "title length is within 5-200 constraint",
    updatedArticle.title.length >= 5 && updatedArticle.title.length <= 200,
  );
  TestValidator.predicate(
    "body length is within 10-50000 constraint",
    updatedArticle.body.length >= 10 && updatedArticle.body.length <= 50000,
  );
}
