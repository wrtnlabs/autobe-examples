import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCategory";
import type { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import type { ITodoAppTaskUpdateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskUpdateResult";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test edge case where bulk category update is attempted with empty task
 * selection. Verifies validation prevents operations with no tasks and provides
 * appropriate error handling for empty task arrays.
 */
export async function test_api_bulk_update_category_empty_selection_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create authenticated user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "password123",
      href: "https://example.com/todo",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Step 2: Create a category to have a valid target
  const category = await api.functional.todoApp.user.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ITodoAppCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Attempt bulk update with empty task array - should fail due to minItems: 1 constraint
  await TestValidator.error(
    "bulk update with empty task selection should fail",
    async () => {
      await api.functional.todoApp.user.tasks.bulk_update_category.updateBulkCategory(
        connection,
        {
          body: {
            task_ids: [], // Empty array violates minItems: 1 constraint
            todo_app_category_id: category.id,
          } satisfies ITodoAppTask.IBulkUpdateCategory,
        },
      );
    },
  );
}
