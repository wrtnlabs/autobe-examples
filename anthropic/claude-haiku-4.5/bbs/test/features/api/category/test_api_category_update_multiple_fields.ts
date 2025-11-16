import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test updating multiple category fields in a single request.
 *
 * This test validates that batch updates work correctly by creating a category
 * and updating multiple fields (name, slug, description, and display_order)
 * simultaneously. The test verifies that all changes are applied correctly and
 * consistently reflected in the response.
 *
 * Process flow:
 *
 * 1. Register a moderator account for authentication
 * 2. Create an initial category with basic properties
 * 3. Update the category with multiple field changes at once
 * 4. Verify that all updated fields are reflected correctly in the response
 * 5. Confirm that the updated_at timestamp has been modified
 */
export async function test_api_category_update_multiple_fields(
  connection: api.IConnection,
) {
  // Step 1: Register moderator for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create initial category
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialSlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: initialName,
          slug: initialSlug,
          description: initialDescription,
          display_order: initialDisplayOrder,
          is_active: true,
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "initial name matches",
    createdCategory.name,
    initialName,
  );
  TestValidator.equals(
    "initial slug matches",
    createdCategory.slug,
    initialSlug,
  );

  // Step 3: Update multiple fields at once
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedSlug = RandomGenerator.alphaNumeric(8).toLowerCase();
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const updatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          name: updatedName,
          slug: updatedSlug,
          description: updatedDescription,
          display_order: updatedDisplayOrder,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Verify all updated fields are reflected correctly
  TestValidator.equals(
    "updated category ID unchanged",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "name updated correctly",
    updatedCategory.name,
    updatedName,
  );
  TestValidator.equals(
    "slug updated correctly",
    updatedCategory.slug,
    updatedSlug,
  );
  TestValidator.equals(
    "description updated correctly",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "display_order updated correctly",
    updatedCategory.display_order,
    updatedDisplayOrder,
  );

  // Step 5: Verify timestamp was updated
  TestValidator.notEquals(
    "updated_at timestamp changed after modification",
    updatedCategory.updated_at,
    createdCategory.updated_at,
  );

  // Verify all fields are consistent in the updated response
  TestValidator.predicate(
    "article count preserved",
    updatedCategory.article_count === createdCategory.article_count,
  );
  TestValidator.predicate(
    "is_active status preserved",
    updatedCategory.is_active === createdCategory.is_active,
  );
}
