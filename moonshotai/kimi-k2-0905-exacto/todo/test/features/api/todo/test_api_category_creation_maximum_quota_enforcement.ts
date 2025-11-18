import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_category_creation_maximum_quota_enforcement(
  connection: api.IConnection,
) {
  // Create a new user account for testing
  const email = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: "TestPassword123",
      ip: "127.0.0.1",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/signup",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Create 50 categories - the maximum allowed
  const categories: ITodoAppCategory[] = [];
  for (let i = 0; i < 50; i++) {
    const category = await api.functional.todoApp.user.categories.create(
      connection,
      {
        body: {
          name: `Category ${i + 1}`,
          description: `Test category number ${i + 1}`,
        } satisfies ITodoAppCategory.ICreate,
      },
    );
    typia.assert(category);
    categories.push(category);
  }

  // Verify all 50 categories were created successfully
  TestValidator.equals("total categories created", categories.length, 50);

  // Attempt to create the 51st category - this should fail
  await TestValidator.error(
    "51st category creation should fail due to quota limit",
    async () => {
      await api.functional.todoApp.user.categories.create(connection, {
        body: {
          name: "Category 51",
          description: "This should exceed quota limit",
        } satisfies ITodoAppCategory.ICreate,
      });
    },
  );

  // Verify the last created category maintains proper structure
  TestValidator.predicate(
    "final category has valid structure",
    categories[49] !== undefined &&
      categories[49].id !== undefined &&
      categories[49].name === "Category 50",
  );
}
