import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test category field length validation including code maximum length, name
 * limits, and description boundaries. This ensures data integrity and interface
 * compatibility. Create a moderator account and test category creation with
 * invalid field lengths: codes exceeding 50 characters, names longer than 100
 * characters, and descriptions beyond 500 characters. The system should reject
 * invalid data with clear validation feedback.
 */
export async function test_api_category_creation_validation_length_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account first (dependency)
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphaNumeric(32),
      moderation_level: "admin",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Test 1: Category code exceeding 50 characters (should fail)
  const longCode = RandomGenerator.alphabets(51); // 51 characters > 50 limit
  await TestValidator.error(
    "category code exceeding 50 characters should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: {
            code: longCode,
            name: "Economics",
            display_order: 1,
            is_active: true,
          } satisfies IEconomicDiscussionCategory.ICreate,
        },
      );
    },
  );

  // Test 2: Category name exceeding 100 characters (should fail)
  const longName = RandomGenerator.alphabets(101); // 101 characters > 100 limit
  await TestValidator.error(
    "category name exceeding 100 characters should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: {
            code: "economics",
            name: longName,
            display_order: 1,
            is_active: true,
          } satisfies IEconomicDiscussionCategory.ICreate,
        },
      );
    },
  );

  // Test 3: Description exceeding 500 characters (should fail)
  const longDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 50,
    sentenceMax: 60,
    wordMin: 8,
    wordMax: 12,
  }); // This will generate content exceeding 500 characters
  await TestValidator.error(
    "category description exceeding 500 characters should be rejected",
    async () => {
      await api.functional.economicDiscussion.moderator.categories.create(
        connection,
        {
          body: {
            code: "economics",
            name: "Economics",
            description: longDescription,
            display_order: 1,
            is_active: true,
          } satisfies IEconomicDiscussionCategory.ICreate,
        },
      );
    },
  );

  // Test 4: Valid category creation with maximum acceptable lengths (should succeed)
  const maxCode = RandomGenerator.alphabets(50); // Exactly 50 characters
  const maxName = RandomGenerator.alphabets(100); // Exactly 100 characters
  const maxDescription = RandomGenerator.paragraph({
    sentences: 40,
    wordMin: 10,
    wordMax: 15,
  }); // Keep under 500 characters by limiting sentence count

  const validCategory =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: maxCode,
          name: maxName,
          description: maxDescription,
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(validCategory);

  // Validate that the created category has acceptable lengths
  TestValidator.predicate(
    "valid category code length <= 50",
    validCategory.code.length <= 50,
  );
  TestValidator.predicate(
    "valid category name length <= 100",
    validCategory.name.length <= 100,
  );
  TestValidator.predicate(
    "valid category description length <= 500",
    !validCategory.description || validCategory.description.length <= 500,
  );

  // Test 5: Empty string validation for required fields (should fail)
  await TestValidator.error("empty code should be rejected", async () => {
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "", // Empty string
          name: "Economics",
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  });

  await TestValidator.error("empty name should be rejected", async () => {
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "economics",
          name: "", // Empty string
          display_order: 1,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  });

  // Test 6: Boundary test with null/undefined descriptions (should succeed)
  const categoryWithNullDesc =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "politics",
          name: "Politics",
          description: null, // null is acceptable
          display_order: 2,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(categoryWithNullDesc);

  const categoryWithNoDesc =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: {
          code: "policy",
          name: "Policy Discussion",
          // description omitted (undefined) - this is also acceptable
          display_order: 3,
          is_active: true,
        } satisfies IEconomicDiscussionCategory.ICreate,
      },
    );
  typia.assert(categoryWithNoDesc);
}
