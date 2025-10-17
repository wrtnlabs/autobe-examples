import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";

/**
 * Test administrator reorganizing category hierarchy by changing parent-child
 * relationships.
 *
 * This test validates the ability to restructure the content taxonomy as
 * discussion topics evolve. It ensures that administrators can move
 * subcategories between different parent categories while maintaining
 * referential integrity and preventing circular references.
 *
 * Workflow:
 *
 * 1. Administrator registers and authenticates
 * 2. Create parent category A (Economics)
 * 3. Create parent category B (Politics)
 * 4. Create subcategory under parent A
 * 5. Update subcategory to change parent from A to B
 * 6. Verify parent relationship updated correctly
 * 7. Validate circular reference prevention
 */
export async function test_api_category_hierarchy_reorganization(
  connection: api.IConnection,
) {
  // Step 1: Administrator registers and authenticates
  const adminCredentials = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminCredentials,
    });
  typia.assert(admin);

  // Step 2: Create parent category A (Economics)
  const categoryA = {
    name: "Economics",
    slug: "economics",
    description: "Economic theory and policy discussions",
    parent_category_id: null,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const parentA: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryA,
      },
    );
  typia.assert(parentA);

  // Step 3: Create parent category B (Politics)
  const categoryB = {
    name: "Politics",
    slug: "politics",
    description: "Political systems and governance discussions",
    parent_category_id: null,
    display_order: 2,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const parentB: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: categoryB,
      },
    );
  typia.assert(parentB);

  // Step 4: Create subcategory under parent A
  const subcategoryData = {
    name: "Macroeconomics",
    slug: "macroeconomics",
    description: "Large-scale economic phenomena",
    parent_category_id: parentA.id,
    display_order: 1,
    is_active: true,
  } satisfies IDiscussionBoardCategory.ICreate;

  const subcategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.create(
      connection,
      {
        body: subcategoryData,
      },
    );
  typia.assert(subcategory);

  TestValidator.equals(
    "subcategory initially under parent A",
    subcategory.parent_category_id,
    parentA.id,
  );

  // Step 5: Update subcategory to change parent from A to B
  const updateData = {
    parent_category_id: parentB.id,
  } satisfies IDiscussionBoardCategory.IUpdate;

  const updatedSubcategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.administrator.categories.update(
      connection,
      {
        categoryId: subcategory.id,
        body: updateData,
      },
    );
  typia.assert(updatedSubcategory);

  // Step 6: Verify parent relationship updated correctly
  TestValidator.equals(
    "subcategory parent changed to parent B",
    updatedSubcategory.parent_category_id,
    parentB.id,
  );

  TestValidator.notEquals(
    "subcategory no longer under parent A",
    updatedSubcategory.parent_category_id,
    parentA.id,
  );

  TestValidator.equals(
    "category name preserved during hierarchy change",
    updatedSubcategory.name,
    subcategory.name,
  );

  TestValidator.equals(
    "category slug preserved during hierarchy change",
    updatedSubcategory.slug,
    subcategory.slug,
  );

  // Step 7: Validate circular reference prevention
  // Attempt to set parentA's parent to subcategory (which would create circular reference)
  await TestValidator.error("circular reference prevented", async () => {
    await api.functional.discussionBoard.administrator.categories.update(
      connection,
      {
        categoryId: parentB.id,
        body: {
          parent_category_id: updatedSubcategory.id,
        } satisfies IDiscussionBoardCategory.IUpdate,
      },
    );
  });
}
