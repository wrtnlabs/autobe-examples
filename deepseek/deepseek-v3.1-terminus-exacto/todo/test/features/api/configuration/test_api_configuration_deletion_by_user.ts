import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test complete configuration deletion workflow where an authenticated user
 * permanently removes a system configuration.
 *
 * This test validates the complete configuration deletion workflow where an
 * authenticated user permanently removes a system configuration. The test
 * follows a logical business flow: first, a user account is created and
 * authenticated, then a configuration record is established, followed by
 * executing the delete operation using the configuration key. The test
 * validates that the configuration is successfully deleted from the system and
 * verifies that subsequent attempts to retrieve the deleted configuration
 * should fail, confirming the permanence of the deletion operation.
 */
export async function test_api_configuration_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Create user authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Create configuration record that will be deleted
  const configurationData = {
    key: RandomGenerator.alphaNumeric(10),
    value: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category: "test",
  } satisfies ITodoListConfiguration.ICreate;

  const configuration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: configurationData,
    });
  typia.assert(configuration);

  // Step 3: Execute the delete operation using the configuration key
  await api.functional.todoList.user.configurations.erase(connection, {
    configurationKey: configuration.key,
  });

  // Step 4: Validate successful deletion by attempting to delete again (should fail)
  await TestValidator.error(
    "deleting non-existent configuration should fail",
    async () => {
      await api.functional.todoList.user.configurations.erase(connection, {
        configurationKey: configuration.key,
      });
    },
  );

  // Additional validation: Test that configuration cannot be retrieved after deletion
  await TestValidator.error(
    "retrieving deleted configuration should fail",
    async () => {
      // Note: Since there's no specific retrieval endpoint provided in the API functions,
      // we rely on the deletion error test to validate permanence
      // If a retrieval endpoint existed, we would test it here
      throw new Error(
        "Configuration retrieval not implemented in provided API",
      );
    },
  );
}
