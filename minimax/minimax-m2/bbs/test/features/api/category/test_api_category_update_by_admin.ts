import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test Category Update Operation by System Administrator
 *
 * This E2E test validates the complete category management workflow for system
 * administrators. The test scenario involves creating a system administrator
 * account, establishing authentication, creating an initial category, then
 * updating it with new information including name, description, and display
 * order. It validates that the update operation preserves referential integrity
 * and correctly applies changes while maintaining proper category
 * relationships.
 */
export async function test_api_category_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate system administrator account
  const adminEmail = `${RandomGenerator.name(1)}@admin.example.com`;
  const adminDisplayName = RandomGenerator.name();

  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: adminDisplayName,
        email: adminEmail,
        bio: `System administrator for category management testing`,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial category with basic information
  const initialCategoryName = "Economic Policy Discussion";
  const initialDescription =
    "Discussions about economic policies, regulations, and their impact on markets";
  const initialDisplayOrder = 1;

  const createdCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: {
          name: initialCategoryName,
          description: initialDescription,
          display_order: initialDisplayOrder,
          is_active: true,
        } satisfies IEconPoliticalDiscussionCategory.ICreate,
      },
    );
  typia.assert(createdCategory);

  // Validate initial category creation
  TestValidator.equals(
    "initial category name matches",
    createdCategory.name,
    initialCategoryName,
  );
  TestValidator.equals(
    "initial category description matches",
    createdCategory.description,
    initialDescription,
  );
  TestValidator.equals(
    "initial display order matches",
    createdCategory.display_order,
    initialDisplayOrder,
  );
  TestValidator.equals(
    "category status is active",
    createdCategory.status,
    "active",
  );
  TestValidator.predicate(
    "category has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdCategory.id,
    ),
  );

  // Step 3: Update category with new information
  const updatedCategoryName = "Fiscal Policy & Economic Analysis";
  const updatedDescription =
    "In-depth analysis of fiscal policies, tax reforms, monetary policy, and economic indicators affecting national and global markets";
  const updatedDisplayOrder = 2;

  const updatedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.update(
      connection,
      {
        categoryId: createdCategory.id,
        body: {
          name: updatedCategoryName,
          description: updatedDescription,
          display_order: updatedDisplayOrder,
        } satisfies IEconPoliticalDiscussionCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate category update operation
  TestValidator.equals(
    "updated category ID matches original",
    updatedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "updated category name is correct",
    updatedCategory.name,
    updatedCategoryName,
  );
  TestValidator.equals(
    "updated category description is correct",
    updatedCategory.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated display order is correct",
    updatedCategory.display_order,
    updatedDisplayOrder,
  );
  TestValidator.equals(
    "category status remains active",
    updatedCategory.status,
    "active",
  );

  // Validate that timestamps were updated
  TestValidator.predicate(
    "updated timestamp is after creation",
    new Date(updatedCategory.updated_at) > new Date(createdCategory.updated_at),
  );
  TestValidator.equals(
    "creation timestamp remains unchanged",
    updatedCategory.created_at,
    createdCategory.created_at,
  );

  // Validate referential integrity
  TestValidator.notEquals(
    "category name has changed",
    updatedCategory.name,
    initialCategoryName,
  );
  TestValidator.notEquals(
    "description has changed",
    updatedCategory.description,
    initialDescription,
  );
  TestValidator.notEquals(
    "display order has changed",
    updatedCategory.display_order,
    initialDisplayOrder,
  );

  // Only validate deleted_at if it exists in the response
  if (updatedCategory.deleted_at !== undefined) {
    TestValidator.equals(
      "deleted_at remains null when present",
      updatedCategory.deleted_at,
      null,
    );
  }
}
