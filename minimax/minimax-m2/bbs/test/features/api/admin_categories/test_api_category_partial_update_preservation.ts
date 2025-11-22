import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_partial_update_preservation(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial category with complete data
  const initialName = "Economic Policy Analysis";
  const initialDescription =
    "Discussion of economic policies and their impacts on markets and society";
  const initialDisplayOrder = 5;

  const originalCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          display_order: initialDisplayOrder,
        } satisfies IEconPoliticalDiscussionCategory.ICreate,
      },
    );
  typia.assert(originalCategory);

  // Step 3: Perform partial update - only change description
  const newDescription =
    "In-depth analysis of economic policies, market trends, and their societal implications for 2024";

  const updatedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.update(
      connection,
      {
        categoryId: originalCategory.id,
        body: {
          name: initialName, // Keep original name
          description: newDescription, // Update only description
        } satisfies IEconPoliticalDiscussionCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);

  // Step 4: Validate partial update preservation
  TestValidator.equals(
    "category ID should remain unchanged after partial update",
    updatedCategory.id,
    originalCategory.id,
  );

  TestValidator.equals(
    "name should be preserved during partial update",
    updatedCategory.name,
    originalCategory.name,
  );

  TestValidator.equals(
    "display order should be preserved during partial update",
    updatedCategory.display_order,
    originalCategory.display_order,
  );

  TestValidator.equals(
    "description should be successfully updated",
    updatedCategory.description,
    newDescription,
  );

  TestValidator.equals(
    "status should remain active after partial update",
    updatedCategory.status,
    originalCategory.status,
  );

  // Verify timestamp changes for updated_at (should be newer)
  TestValidator.predicate(
    "updated_at timestamp should be newer after partial update",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(originalCategory.updated_at).getTime(),
  );

  TestValidator.equals(
    "created_at timestamp should remain unchanged",
    updatedCategory.created_at,
    originalCategory.created_at,
  );
}
