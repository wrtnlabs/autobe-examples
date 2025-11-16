import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test member's ability to update individual fields of their article without
 * affecting other fields.
 *
 * This test validates the partial update functionality ensuring that when
 * updating only the title, the body remains unchanged, and when updating only
 * the body, the title remains unchanged. It also verifies that the updated_at
 * timestamp changes with each update.
 *
 * Workflow:
 *
 * 1. Create and authenticate member account
 * 2. Create article with specific initial title and body
 * 3. Update only title field, verify body unchanged
 * 4. Update only body field, verify title unchanged
 * 5. Verify updated_at timestamp progresses correctly
 * 6. Ensure no unintended side effects on other fields
 */
export async function test_api_article_member_partial_field_update(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create article with known initial title and body
  const originalTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const originalBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 15,
  });

  const createdArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: originalTitle,
        body: originalBody,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);

  TestValidator.equals(
    "created article title matches",
    createdArticle.title,
    originalTitle,
  );
  TestValidator.equals(
    "created article body matches",
    createdArticle.body,
    originalBody,
  );

  const originalCreatedAt = createdArticle.created_at;
  const firstUpdatedAt = createdArticle.updated_at;

  // Step 3: Update only the title field, body should remain unchanged
  const newTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });

  const titleUpdatedArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: newTitle,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(titleUpdatedArticle);

  TestValidator.equals(
    "title updated successfully",
    titleUpdatedArticle.title,
    newTitle,
  );
  TestValidator.equals(
    "body remained unchanged after title update",
    titleUpdatedArticle.body,
    originalBody,
  );
  TestValidator.equals(
    "article ID remained stable",
    titleUpdatedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "created_at timestamp unchanged",
    titleUpdatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed after title update",
    titleUpdatedArticle.updated_at !== firstUpdatedAt,
  );

  const secondUpdatedAt = titleUpdatedArticle.updated_at;

  // Step 4: Update only the body field, title should remain from previous update
  const newBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 12,
    sentenceMax: 20,
  });

  const bodyUpdatedArticle =
    await api.functional.discussionBoard.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        body: newBody,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(bodyUpdatedArticle);

  TestValidator.equals(
    "body updated successfully",
    bodyUpdatedArticle.body,
    newBody,
  );
  TestValidator.equals(
    "title remained from previous update",
    bodyUpdatedArticle.title,
    newTitle,
  );
  TestValidator.equals(
    "article ID still stable",
    bodyUpdatedArticle.id,
    createdArticle.id,
  );
  TestValidator.equals(
    "created_at still unchanged",
    bodyUpdatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed after body update",
    bodyUpdatedArticle.updated_at !== secondUpdatedAt,
  );

  // Step 5: Verify sequential update consistency
  TestValidator.notEquals(
    "final title different from original",
    bodyUpdatedArticle.title,
    originalTitle,
  );
  TestValidator.notEquals(
    "final body different from original",
    bodyUpdatedArticle.body,
    originalBody,
  );
  TestValidator.predicate(
    "updated_at progressed through updates",
    bodyUpdatedArticle.updated_at > titleUpdatedArticle.updated_at &&
      titleUpdatedArticle.updated_at >= createdArticle.updated_at,
  );
}
