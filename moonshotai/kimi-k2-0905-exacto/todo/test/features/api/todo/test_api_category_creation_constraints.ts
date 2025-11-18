import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_creation_constraints(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and establish authentication
  const email = typia.random<string & tags.Format<"email">>();
  const href = "http://localhost:3000";
  const referrer = "http://localhost:3000";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(8),
      href,
      referrer,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create initial category with valid name
  const firstCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Tasks",
        description: "Professional assignments and deadlines",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(firstCategory);

  // Step 3: Attempt to create category with duplicate name - should fail
  await TestValidator.error(
    "duplicate category name should be rejected",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: "Work Tasks", // Same name as first category
          description: "Duplicate work category",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );

  // Step 4: Create category with modified name - should succeed
  const secondCategory = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: "Work Projects", // Similar but distinct name
        description: "Alternative work task organization",
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(secondCategory);

  // Step 5: Verify both categories exist and are distinct
  TestValidator.notEquals(
    "created categories should have different IDs",
    firstCategory.id,
    secondCategory.id,
  );

  TestValidator.equals(
    "first category name should be retained",
    firstCategory.name,
    "Work Tasks",
  );

  TestValidator.equals(
    "second category should have different name",
    secondCategory.name,
    "Work Projects",
  );
}
