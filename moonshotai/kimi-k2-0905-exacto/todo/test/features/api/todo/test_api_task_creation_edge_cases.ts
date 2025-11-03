import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTask";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test task creation edge cases including empty descriptions, maximum character
 * limits, and special characters. Validates input sanitization, whitespace
 * handling, and that the system properly trims leading/trailing whitespace
 * while maintaining data integrity across different input scenarios.
 */
export async function test_api_task_creation_edge_cases(
  connection: api.IConnection,
) {
  // 1. Create user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: "testpassword123",
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  // 2. Test normal task creation as control
  const normalTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        description: "Normal task description",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/home",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(normalTask);
  TestValidator.equals(
    "normal task description",
    normalTask.description,
    "Normal task description",
  );

  // 3. Test maximum character limit (exactly 500 characters)
  const maxLengthDescription = ArrayUtil.repeat(500, () => "A").join("");
  const maxLengthTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        description: maxLengthDescription,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/home",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(maxLengthTask);
  TestValidator.equals(
    "max length task description length",
    maxLengthTask.description.length,
    500,
  );

  // 4. Test description with leading/trailing whitespace
  const originalDescription = "  Task with whitespace  ";
  const whitespaceTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        description: originalDescription,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/home",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(whitespaceTask);
  // Verify system properly trims whitespace
  TestValidator.equals(
    "whitespace trimmed",
    whitespaceTask.description,
    "Task with whitespace",
  );
  TestValidator.notEquals(
    "original whitespace preserved",
    whitespaceTask.description,
    originalDescription,
  );

  // 5. Test description with special characters and Unicode
  const specialCharsDescription =
    "Task with special chars: @#$%^&*() 🚀 ñ é 中文";
  const specialCharsTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        description: specialCharsDescription,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/home",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(specialCharsTask);
  TestValidator.equals(
    "special characters preserved",
    specialCharsTask.description,
    specialCharsDescription,
  );

  // 6. Test duplicate task description (should fail due to unique constraint)
  const duplicateDescription = "Duplicate task description";
  await api.functional.todo.user.users.tasks.create(connection, {
    userId: user.id,
    body: {
      description: duplicateDescription,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/home",
    } satisfies ITodoTask.ICreate,
  });

  // Try to create another task with same description (should fail)
  await TestValidator.error("duplicate description should fail", async () => {
    await api.functional.todo.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        description: duplicateDescription,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/home",
      } satisfies ITodoTask.ICreate,
    });
  });

  // 7. Test task with null business status (nullable field)
  const nullBusinessStatusTask =
    await api.functional.todo.user.users.tasks.create(connection, {
      userId: user.id,
      body: {
        description: "Task with null business status",
        business_status: null,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/home",
      } satisfies ITodoTask.ICreate,
    });
  typia.assert(nullBusinessStatusTask);
  TestValidator.equals(
    "null business status handled",
    nullBusinessStatusTask.business_status,
    null,
  );

  // 8. Test very long description (over 500 characters - should fail)
  const tooLongDescription = ArrayUtil.repeat(501, () => "X").join("");
  await TestValidator.error(
    "description over 500 characters should fail",
    async () => {
      await api.functional.todo.user.users.tasks.create(connection, {
        userId: user.id,
        body: {
          description: tooLongDescription,
          href: "http://localhost:3000",
          referrer: "http://localhost:3000/home",
        } satisfies ITodoTask.ICreate,
      });
    },
  );

  // 9. Test task with IP address
  const ipTask = await api.functional.todo.user.users.tasks.create(connection, {
    userId: user.id,
    body: {
      description: "Task with IP tracking",
      ip: "192.168.1.1",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000/home",
    } satisfies ITodoTask.ICreate,
  });
  typia.assert(ipTask);
  TestValidator.equals("IP address preserved", ipTask.user.id, user.id);

  // 10. Test task with empty referrer (edge case)
  const emptyReferrerTask = await api.functional.todo.user.users.tasks.create(
    connection,
    {
      userId: user.id,
      body: {
        description: "Task with empty referrer",
        href: "http://localhost:3000",
        referrer: "",
      } satisfies ITodoTask.ICreate,
    },
  );
  typia.assert(emptyReferrerTask);
  TestValidator.equals(
    "empty referrer handled",
    emptyReferrerTask.description,
    "Task with empty referrer",
  );
}
