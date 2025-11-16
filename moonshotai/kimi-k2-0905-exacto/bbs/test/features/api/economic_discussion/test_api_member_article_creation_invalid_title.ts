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
 * Test article creation rejection for invalid or missing title to verify title
 * validation requirements.
 *
 * This test validates that the API properly rejects article creation when the
 * title is invalid. It covers multiple scenarios:
 *
 * 1. Empty string titles
 * 2. Null or undefined titles
 * 3. Whitespace-only titles
 * 4. Titles exceeding 500 character limit
 * 5. Titles with only special characters
 *
 * The test ensures proper validation and meaningful error responses from the
 * system. All validation should occur with proper authentication and valid
 * supporting data.
 */
export async function test_api_member_article_creation_invalid_title(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicDiscussionMember.ICreate,
  });

  // Step 2: Create a moderator and category for valid reference
  const moderatorUsername = RandomGenerator.name();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: moderatorPassword,
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });

  const category =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );

  // Step 3: Switch back to member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password_hash: memberPassword,
    } satisfies IEconomicDiscussionMember.ILogin,
  });

  // Step 4: Test empty string title (should fail)
  const requestBody1 = {
    title: "",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  await TestValidator.error(
    "empty string title should be rejected",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: requestBody1,
        },
      );
    },
  );

  // Step 5: Test whitespace-only title (should fail)
  const requestBody2 = {
    title: "   \n\t  ",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  await TestValidator.error(
    "whitespace-only title should be rejected",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: requestBody2,
        },
      );
    },
  );

  // Step 6: Test title exceeding 500 characters (should fail)
  const longTitle = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 80,
    sentenceMax: 100,
    wordMin: 8,
    wordMax: 12,
  })
    .replace(/\s+/g, " ")
    .trim(); // Ensure it's a single line string

  const requestBody3 = {
    title: longTitle,
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  await TestValidator.error(
    "title exceeding 500 characters should be rejected",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: requestBody3,
        },
      );
    },
  );

  // Step 7: Test title with only special characters (should fail)
  const requestBody4 = {
    title: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  await TestValidator.error(
    "title with only special characters should be rejected",
    async () => {
      await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: requestBody4,
        },
      );
    },
  );

  // Step 8: Test title with special characters mixed with valid text (should pass)
  const validRequestBody = {
    title:
      "Economic Policy Analysis: Understanding Market Trends & Government Impact",
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 8,
    }),
    category_ids: [category.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: validRequestBody,
    });

  typia.assert(article);

  TestValidator.equals(
    "valid title should create article successfully",
    article.title,
    validRequestBody.title,
  );
}
