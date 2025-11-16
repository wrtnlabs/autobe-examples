import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test category retrieval with and without descriptions.
 *
 * This test validates that categories can be created with optional descriptions
 * and that the description field is properly handled when present or null.
 *
 * Test flow:
 *
 * 1. Authenticate as moderator
 * 2. Create category with detailed description
 * 3. Create category without description (null)
 * 4. Retrieve both categories and verify description handling
 * 5. Validate field integrity and data consistency
 */
export async function test_api_category_retrieval_with_description(
  connection: api.IConnection,
) {
  // 1. Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create category with detailed description
  const categoryWithDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithDescription);

  // 3. Create category without description (null)
  const categoryWithoutDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: null,
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(categoryWithoutDescription);

  // 4. Retrieve first category and verify description is present
  const retrievedCategoryWithDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: categoryWithDescription.id,
    });
  typia.assert(retrievedCategoryWithDescription);
  TestValidator.equals(
    "category with description matches",
    retrievedCategoryWithDescription,
    categoryWithDescription,
  );
  TestValidator.predicate(
    "description should be present",
    retrievedCategoryWithDescription.description !== null &&
      retrievedCategoryWithDescription.description !== undefined,
  );

  // 5. Retrieve second category and verify description is null
  const retrievedCategoryWithoutDescription: IDiscussionBoardCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: categoryWithoutDescription.id,
    });
  typia.assert(retrievedCategoryWithoutDescription);
  TestValidator.equals(
    "category without description matches",
    retrievedCategoryWithoutDescription,
    categoryWithoutDescription,
  );
  TestValidator.predicate(
    "description should be null or undefined",
    retrievedCategoryWithoutDescription.description === null ||
      retrievedCategoryWithoutDescription.description === undefined,
  );

  // 6. Validate field integrity
  TestValidator.equals(
    "first category ID matches",
    retrievedCategoryWithDescription.id,
    categoryWithDescription.id,
  );
  TestValidator.equals(
    "first category name matches",
    retrievedCategoryWithDescription.name,
    categoryWithDescription.name,
  );
  TestValidator.equals(
    "first category slug matches",
    retrievedCategoryWithDescription.slug,
    categoryWithDescription.slug,
  );
  TestValidator.equals(
    "first category display_order matches",
    retrievedCategoryWithDescription.display_order,
    categoryWithDescription.display_order,
  );
  TestValidator.equals(
    "first category is_active matches",
    retrievedCategoryWithDescription.is_active,
    categoryWithDescription.is_active,
  );

  TestValidator.equals(
    "second category ID matches",
    retrievedCategoryWithoutDescription.id,
    categoryWithoutDescription.id,
  );
  TestValidator.equals(
    "second category name matches",
    retrievedCategoryWithoutDescription.name,
    categoryWithoutDescription.name,
  );
  TestValidator.equals(
    "second category slug matches",
    retrievedCategoryWithoutDescription.slug,
    categoryWithoutDescription.slug,
  );
  TestValidator.equals(
    "second category display_order matches",
    retrievedCategoryWithoutDescription.display_order,
    categoryWithoutDescription.display_order,
  );
  TestValidator.equals(
    "second category is_active matches",
    retrievedCategoryWithoutDescription.is_active,
    categoryWithoutDescription.is_active,
  );
}
