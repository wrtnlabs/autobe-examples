import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionCategory";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test that repeated deletion attempts on the same category handle gracefully.
 *
 * Creates admin account and category, performs initial deletion, then attempts
 * to delete the same category again. Validates that subsequent deletion
 * attempts return appropriate responses without causing errors or
 * inconsistencies in the system state, ensuring robust deletion behavior.
 *
 * The test validates critical idempotency patterns where multiple delete
 * requests on the same resource should not cause system failures. This is
 * essential for:
 *
 * - Retry logic in distributed systems
 * - Concurrent deletion attempts
 * - Network timeout recovery scenarios
 * - Client-side retry mechanisms
 */
export async function test_api_category_deletion_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Create system administrator account for authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a test category for deletion testing
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 12,
    }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    is_active: true,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const createdCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(createdCategory);

  // Verify category was created with expected properties
  TestValidator.equals(
    "created category matches input data",
    createdCategory.name,
    categoryData.name,
  );
  TestValidator.equals(
    "created category has active status",
    createdCategory.status,
    "active",
  );

  // Step 3: Perform initial category deletion
  const firstDeletionResult: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.erase(
      connection,
      { categoryId: createdCategory.id },
    );
  typia.assert(firstDeletionResult);

  // Validate initial deletion response
  TestValidator.equals(
    "first deletion returns category data",
    firstDeletionResult.id,
    createdCategory.id,
  );

  // Step 4: Attempt repeated deletion on the same category (idempotency test)
  await TestValidator.error(
    "second deletion attempt should be handled gracefully",
    async () => {
      await api.functional.econPoliticalDiscussion.systemAdministrator.categories.erase(
        connection,
        { categoryId: createdCategory.id },
      );
    },
  );

  // Step 5: Create additional category to verify system state consistency
  const secondCategoryData = {
    name: "Economic Policy Discussion",
    description: "Category for discussing economic policies and their impacts",
    display_order: 10,
    is_active: true,
  } satisfies IEconPoliticalDiscussionCategory.ICreate;

  const secondCategory: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.create(
      connection,
      { body: secondCategoryData },
    );
  typia.assert(secondCategory);

  // Verify system can still create new categories after deletion operations
  TestValidator.equals(
    "system can create new categories after deletion",
    secondCategory.name,
    secondCategoryData.name,
  );
  TestValidator.equals(
    "new category has unique ID",
    secondCategory.id !== createdCategory.id,
    true,
  );

  // Step 6: Clean up - delete the second category
  const cleanupDeletion: IEconPoliticalDiscussionCategory =
    await api.functional.econPoliticalDiscussion.systemAdministrator.categories.erase(
      connection,
      { categoryId: secondCategory.id },
    );
  typia.assert(cleanupDeletion);

  // Final validation: system remains functional
  TestValidator.equals(
    "cleanup deletion successful",
    cleanupDeletion.id,
    secondCategory.id,
  );
}
