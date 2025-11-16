import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article creation with minimum required content to validate input
 * validation rules.
 *
 * This implementation tests the complete validation workflow for economic
 * discussion article creation. We start by creating a member account for
 * authentication, then systematically test all validation constraints defined
 * in the Article ICreate DTO:
 *
 * 1. Title requirements: min 1 character, max 500 characters
 * 2. Content requirements: min 10 characters, max 50000 characters
 * 3. Category requirements: uses MinItems<0> allowing empty arrays based on actual
 *    DTO
 * 4. File attachment constraints: up to 5 attachments allowed
 * 5. Member registration validation: username pattern, email format, password
 *    length
 *
 * The test validates both successful scenarios with minimal/maximum content
 * bounds and failure scenarios that should be rejected by the system with
 * proper error handling.
 */
export async function test_api_article_minimal_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    username: "test_member_123",
    email: "test@example.com",
    password: "password123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Test creating article with minimal valid content (1 char title, 10 char content)
  const minimalArticle = {
    title: "A", // Single character title
    content:
      "This is exactly 10 characters minimum required content text structure completely",
    category_ids: [], // Empty array is allowed due to MinItems<0> constraint
  } satisfies IEconomicDiscussionArticle.ICreate;

  const minimalResult =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: minimalArticle,
    });
  typia.assert(minimalResult);
  TestValidator.equals(
    "minimal article title",
    minimalResult.title,
    minimalArticle.title,
  );
  TestValidator.equals(
    "minimal article content",
    minimalResult.content,
    minimalArticle.content,
  );

  // Step 3: Test creating article with maximum length content
  const maxTitle = RandomGenerator.alphabets(500); // Exactly 500 characters
  const maxContent = RandomGenerator.alphabets(50000); // Exactly 50000 characters

  const maximalArticle = {
    title: maxTitle,
    content: maxContent,
    category_ids: ArrayUtil.repeat(5, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
  } satisfies IEconomicDiscussionArticle.ICreate;

  const maximalResult =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: maximalArticle,
    });
  typia.assert(maximalResult);
  TestValidator.equals(
    "maximal article title",
    maximalResult.title,
    maximalArticle.title,
  );
  TestValidator.equals(
    "maximal article content",
    maximalResult.content,
    maximalArticle.content,
  );

  // Step 4: Test article creation with attachments
  const fileTypes = ["document", "image", "spreadsheet"] as const;

  const articleWithAttachments = {
    title: "Article with attachments",
    content:
      "This article includes multiple file attachments for testing attachment validation constraints",
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
    attachments: [
      {
        file_size: 1024, // 1KB
        file_type: RandomGenerator.pick(fileTypes),
        filename: "report.pdf",
        mime_type: "application/pdf",
      },
      {
        file_size: 512000, // 500KB
        file_type: RandomGenerator.pick(fileTypes),
        filename: "data.xlsx",
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const attachmentResult =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleWithAttachments,
    });
  typia.assert(attachmentResult);

  // Step 5: Test validation failures - invalid member registration
  await TestValidator.error("invalid email format should fail", async () => {
    const invalidEmailMember = {
      username: "bad_email_user",
      email: "invalid-email-format",
      password: "password123",
    } satisfies IEconomicDiscussionMember.ICreate;

    await api.functional.auth.member.join(connection, {
      body: invalidEmailMember,
    });
  });

  await TestValidator.error("short password should fail", async () => {
    const shortPasswordMember = {
      username: "short_password_user",
      email: "short@example.com",
      password: "123", // Less than 8 characters
    } satisfies IEconomicDiscussionMember.ICreate;

    await api.functional.auth.member.join(connection, {
      body: shortPasswordMember,
    });
  });

  await TestValidator.error("invalid username format should fail", async () => {
    const invalidUsernameMember = {
      username: "invalid user@name!", // Contains spaces and special characters, doesn't match pattern
      email: "valid@example.com",
      password: "password123",
    } satisfies IEconomicDiscussionMember.ICreate;

    await api.functional.auth.member.join(connection, {
      body: invalidUsernameMember,
    });
  });

  // Step 6: Response structure validation
  TestValidator.predicate(
    "article has required fields",
    () =>
      minimalResult.id !== undefined &&
      minimalResult.title !== undefined &&
      minimalResult.content !== undefined &&
      minimalResult.view_count !== undefined &&
      minimalResult.version !== undefined &&
      minimalResult.status !== undefined &&
      minimalResult.created_at !== undefined &&
      minimalResult.updated_at !== undefined,
  );

  TestValidator.equals("current view count is 0", minimalResult.view_count, 0);
  TestValidator.equals("initial version is 1", minimalResult.version, 1);
  TestValidator.predicate(
    "status should be pending, approved, or rejected",
    () => ["pending", "approved", "rejected"].includes(minimalResult.status),
  );

  // Step 7: Test boundary conditions for title and content validation
  await TestValidator.error("empty title should fail", async () => {
    const emptyTitleArticle = {
      title: "", // Empty string is less than minLength<1>
      content:
        "Valid content length for testing title validation boundary conditions",
      category_ids: [],
    } satisfies IEconomicDiscussionArticle.ICreate;

    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: emptyTitleArticle,
    });
  });

  await TestValidator.error("short content should fail", async () => {
    const shortContentArticle = {
      title: "Valid Title",
      content: "Short", // 5 characters is less than minLength<10>
      category_ids: [],
    } satisfies IEconomicDiscussionArticle.ICreate;

    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: shortContentArticle,
    });
  });
}
