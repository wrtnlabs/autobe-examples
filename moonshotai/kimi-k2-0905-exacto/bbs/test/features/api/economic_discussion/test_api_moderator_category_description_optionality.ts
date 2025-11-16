import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";

/**
 * Test optional category description field allowing administrators to add
 * contextual information or leave description null for minimal categories.
 * Validates proper handling of null descriptions and description updates.
 *
 * This test ensures that the API correctly handles the description field as
 * optional - it can be provided with text, provided as null, or omitted
 * entirely. The test will create multiple categories with different description
 * scenarios:
 *
 * - With a description,
 * - With null description,
 * - Without a description field, then verify the responses match the expected
 *   structure and the data is stored correctly.
 */
export async function test_api_moderator_category_description_optionality(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator account first to authenticate category creation
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: moderatorEmail,
      password_hash: "hashed_password_123",
      moderation_level: "admin",
      email_verified: true,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Test 1: Create category with description
  const categoryWithDescription = {
    code: "TEST_CAT_1",
    name: "Test Category With Description",
    description:
      "This is a detailed description for testing category optionality and description validation in the economic discussion platform",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category1 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryWithDescription,
      },
    );
  typia.assert(category1);

  TestValidator.equals(
    "category with description has correct code",
    category1.code,
    categoryWithDescription.code,
  );
  TestValidator.equals(
    "category with description has correct name",
    category1.name,
    categoryWithDescription.name,
  );
  TestValidator.equals(
    "category with description has description",
    category1.description,
    categoryWithDescription.description,
  );

  // Test 2: Create category with null description
  const categoryWithNullDescription = {
    code: "TEST_CAT_2",
    name: "Test Category With Null Description",
    description: null,
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category2 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryWithNullDescription,
      },
    );
  typia.assert(category2);

  TestValidator.equals(
    "category with null description has correct code",
    category2.code,
    categoryWithNullDescription.code,
  );
  TestValidator.equals(
    "category with null description has correct name",
    category2.name,
    categoryWithNullDescription.name,
  );
  TestValidator.equals(
    "category with null description has null description",
    category2.description,
    categoryWithNullDescription.description,
  );

  // Test 3: Create category without description field (undefined)
  const categoryWithoutDescription = {
    code: "TEST_CAT_3",
    name: "Test Category Without Description",
    display_order: 3,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category3 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      {
        body: categoryWithoutDescription,
      },
    );
  typia.assert(category3);

  TestValidator.equals(
    "category without description has correct code",
    category3.code,
    categoryWithoutDescription.code,
  );
  TestValidator.equals(
    "category without description has correct name",
    category3.name,
    categoryWithoutDescription.name,
  );
  TestValidator.equals(
    "category without description has null description",
    category3.description,
    null,
  );
}
