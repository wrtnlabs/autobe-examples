import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_category_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate system administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: "System Administrator",
        email: adminEmail,
        bio: "Test system administrator for category deletion testing",
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a test category that will be deleted
  const testCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category for Deletion",
          description:
            "This is a test category that will be deleted in the E2E test to validate the deletion functionality",
          display_order: 999,
          is_active: true,
        } satisfies IEconPoliticalDiscussionCategory.ICreate,
      },
    );
  typia.assert(testCategory);

  // Step 3: Validate the category was created successfully
  TestValidator.equals(
    "test category was created successfully",
    testCategory.name,
    "Test Category for Deletion",
  );
  TestValidator.equals(
    "test category is initially active",
    testCategory.status,
    "active",
  );

  // Step 4: Delete the category using system administrator privileges
  const deletedCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.erase(
      connection,
      {
        categoryId: testCategory.id,
      },
    );
  typia.assert(deletedCategory);

  // Step 5: Validate deletion results
  TestValidator.equals(
    "deleted category has same ID as original",
    deletedCategory.id,
    testCategory.id,
  );
  TestValidator.equals(
    "deleted category name is preserved",
    deletedCategory.name,
    testCategory.name,
  );
  TestValidator.equals(
    "deleted category description is preserved",
    deletedCategory.description,
    testCategory.description,
  );
  TestValidator.equals(
    "deleted category display order is preserved",
    deletedCategory.display_order,
    testCategory.display_order,
  );

  // Step 6: Verify soft deletion implementation
  TestValidator.predicate(
    "deleted category has deletion timestamp",
    deletedCategory.deleted_at !== null &&
      deletedCategory.deleted_at !== undefined,
  );

  // Step 7: Validate deletion timestamp format and logic
  TestValidator.predicate(
    "deletion timestamp is valid ISO 8601 format",
    typeof deletedCategory.deleted_at === "string" &&
      !isNaN(Date.parse(deletedCategory.deleted_at!)),
  );

  // Step 8: Verify category status after deletion
  TestValidator.equals(
    "deleted category status becomes archived",
    deletedCategory.status,
    "archived",
  );

  // Step 9: Validate audit trail preservation
  TestValidator.equals(
    "original creation timestamp is preserved",
    deletedCategory.created_at,
    testCategory.created_at,
  );

  // Step 10: Verify updated timestamp reflects deletion time
  TestValidator.predicate(
    "updated timestamp reflects deletion time",
    new Date(deletedCategory.updated_at) >= new Date(testCategory.updated_at),
  );
}
