import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category creation with optional description field.
 *
 * This test validates that the description field is truly optional when
 * creating discussion board categories. It tests three scenarios:
 *
 * 1. Creating a category with a comprehensive description (up to 1000 characters)
 * 2. Creating a category with null description
 * 3. Creating a category with a short description
 *
 * The test confirms that descriptions are properly stored and retrievable, and
 * that null descriptions don't cause validation errors.
 *
 * Workflow:
 *
 * 1. Register a moderator account
 * 2. Create a category with maximum length description
 * 3. Create a category with null description
 * 4. Create a category with a short description
 * 5. Verify all categories are created correctly with proper description handling
 */
export async function test_api_category_creation_with_optional_description(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        password: RandomGenerator.alphabets(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator created successfully", !!moderator.id);

  // Step 2: Create a category with comprehensive description (maximum length)
  const comprehensiveDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 1000);

  const categoryWithDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: comprehensiveDescription,
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithDescription);
  TestValidator.equals(
    "category with description stored correctly",
    categoryWithDescription.description,
    comprehensiveDescription,
  );
  TestValidator.predicate(
    "description is not null",
    categoryWithDescription.description !== null,
  );

  // Step 3: Create a category with null description
  const categoryWithNullDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: null,
          display_order: 2,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithNullDescription);
  TestValidator.predicate(
    "null description handled correctly",
    categoryWithNullDescription.description === null ||
      categoryWithNullDescription.description === undefined,
  );

  // Step 4: Create a category without description field (undefined)
  const categoryWithoutDescriptionField: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 3,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithoutDescriptionField);
  TestValidator.predicate(
    "missing description field handled correctly",
    categoryWithoutDescriptionField.description === null ||
      categoryWithoutDescriptionField.description === undefined,
  );

  // Step 5: Create a category with a short description
  const shortDescription = "Quick category for testing";
  const categoryWithShortDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: shortDescription,
          display_order: 4,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithShortDescription);
  TestValidator.equals(
    "short description stored correctly",
    categoryWithShortDescription.description,
    shortDescription,
  );

  // Verify all categories have proper structure
  TestValidator.predicate(
    "category with description has id",
    !!categoryWithDescription.id,
  );
  TestValidator.predicate(
    "category with description has valid timestamps",
    !!categoryWithDescription.created_at &&
      !!categoryWithDescription.updated_at,
  );
  TestValidator.predicate(
    "category with null description has id",
    !!categoryWithNullDescription.id,
  );
  TestValidator.predicate(
    "category without description field has id",
    !!categoryWithoutDescriptionField.id,
  );
  TestValidator.predicate(
    "category with short description has id",
    !!categoryWithShortDescription.id,
  );

  // Confirm description field is optional and works correctly
  TestValidator.predicate(
    "optional description field properly configured",
    categoryWithDescription.description !==
      categoryWithNullDescription.description,
  );
}
