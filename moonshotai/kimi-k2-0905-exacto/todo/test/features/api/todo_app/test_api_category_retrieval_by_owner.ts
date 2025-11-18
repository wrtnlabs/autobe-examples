import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test category retrieval by owner for data privacy and isolation.
 *
 * This test validates that users can successfully retrieve their own category
 * details including name, description, timestamps, and user relationship data.
 * It verifies proper authentication enforcement and ensures category ownership
 * isolation where users can only access categories they have created.
 *
 * 1. Create a new user account for authentication
 * 2. Generate a test category ID for retrieval
 * 3. Retrieve the category with proper authentication
 * 4. Validate category structure and ownership data
 * 5. Verify data privacy through access control
 */
export async function test_api_category_retrieval_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "MySecurePassword123!",
        href: "https://example.com/todo",
        referrer: "https://example.com/",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(user);

  // Step 2: Generate a test category ID for retrieval
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Retrieve the category with proper authentication
  // The connection now contains the authorization token from the join operation
  const category: ITodoAppCategory =
    await api.functional.todoApp.user.categories.at(connection, {
      categoryId: categoryId,
    });
  typia.assert(category);

  // Step 4: Validate category structure and ownership data
  // Verify the category contains required fields
  TestValidator.predicate("category has ID", !!category.id);
  TestValidator.predicate("category has name", !!category.name);
  TestValidator.predicate("category has user reference", !!category.user);
  TestValidator.predicate(
    "category has created_at timestamp",
    !!category.created_at,
  );
  TestValidator.predicate(
    "category has updated_at timestamp",
    !!category.updated_at,
  );

  // Validate user relationship data
  TestValidator.predicate("user has ID", !!category.user.id);
  TestValidator.predicate("user has email", !!category.user.email);
  TestValidator.predicate("user has created_at", !!category.user.created_at);

  // Step 5: Verify data privacy through access control
  // Ensure the returned category user matches the authenticated user
  TestValidator.equals(
    "category belongs to authenticated user",
    category.user.id,
    user.id,
  );
  TestValidator.equals(
    "category user email matches",
    category.user.email,
    userEmail,
  );
  TestValidator.predicate(
    "category ID matches request",
    category.id === categoryId,
  );

  // Additional validation - category should have valid timestamps
  TestValidator.predicate(
    "created_at is valid ISO date",
    new Date(category.created_at).toISOString() === category.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    new Date(category.updated_at).toISOString() === category.updated_at,
  );

  // Test optional description field handling
  if (category.description !== undefined && category.description !== null) {
    TestValidator.predicate(
      "description is string",
      typeof category.description === "string",
    );
  }

  // Validate user timestamps
  TestValidator.predicate(
    "user created_at is valid ISO date",
    new Date(category.user.created_at).toISOString() ===
      category.user.created_at,
  );

  if (
    category.user.updated_at !== undefined &&
    category.user.updated_at !== null
  ) {
    TestValidator.predicate(
      "user updated_at is valid ISO date when present",
      new Date(category.user.updated_at).toISOString() ===
        category.user.updated_at,
    );
  }

  if (
    category.user.deleted_at !== undefined &&
    category.user.deleted_at !== null
  ) {
    TestValidator.predicate(
      "user deleted_at is valid ISO date when present",
      new Date(category.user.deleted_at).toISOString() ===
        category.user.deleted_at,
    );
  }
}
