import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test administrator deactivating and reactivating categories to manage
 * category availability without deletion.
 *
 * This test validates the complete lifecycle of category activation status
 * management, ensuring that administrators can temporarily disable categories
 * without data loss and restore them when needed. This demonstrates graceful
 * category lifecycle management.
 *
 * Workflow steps:
 *
 * 1. Administrator registers and authenticates
 * 2. Administrator creates an active category
 * 3. Administrator deactivates category by setting is_active to false
 * 4. Verify category deactivation was successful
 * 5. Administrator reactivates category by setting is_active to true
 * 6. Verify category reactivation was successful
 *
 * Validation points:
 *
 * - Deactivation properly sets is_active to false
 * - Category metadata is preserved during status changes
 * - Reactivation restores is_active to true
 * - Is_active toggle provides reversible category management
 */
export async function test_api_category_deactivation_and_reactivation(
  connection: api.IConnection,
) {
  // Step 1: Administrator registers and authenticates
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(adminAuth);

  // Step 2: Administrator creates an active category
  const categoryData = {
    name: RandomGenerator.name(2),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    parent_category_id: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const createdCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Verify initial active status
  TestValidator.equals(
    "category initially active",
    createdCategory.is_active,
    true,
  );
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categoryData.slug,
  );

  // Step 3: Administrator deactivates category
  const deactivateUpdate = {
    is_active: false,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const deactivatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: deactivateUpdate,
      },
    );
  typia.assert(deactivatedCategory);

  // Step 4: Verify category deactivation
  TestValidator.equals(
    "category deactivated successfully",
    deactivatedCategory.is_active,
    false,
  );
  TestValidator.equals(
    "category name preserved after deactivation",
    deactivatedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category slug preserved after deactivation",
    deactivatedCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "category description preserved",
    deactivatedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "display order preserved",
    deactivatedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "category ID unchanged",
    deactivatedCategory.id,
    createdCategory.id,
  );

  // Step 5: Administrator reactivates category
  const reactivateUpdate = {
    is_active: true,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const reactivatedCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: reactivateUpdate,
      },
    );
  typia.assert(reactivatedCategory);

  // Step 6: Verify category reactivation
  TestValidator.equals(
    "category reactivated successfully",
    reactivatedCategory.is_active,
    true,
  );
  TestValidator.equals(
    "category name preserved after reactivation",
    reactivatedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "category slug preserved after reactivation",
    reactivatedCategory.slug,
    createdCategory.slug,
  );
  TestValidator.equals(
    "category description still preserved",
    reactivatedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "display order still preserved",
    reactivatedCategory.display_order,
    createdCategory.display_order,
  );
  TestValidator.equals(
    "category ID still unchanged",
    reactivatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "topic count preserved",
    reactivatedCategory.topic_count,
    0,
  );
}
