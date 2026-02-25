import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_password_reset_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Attempt to retrieve a non-existent password reset request
  // Using a valid UUID format but no matching record exists
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  // The system should return 'Not Found' for non-existent reset IDs
  await TestValidator.error(
    "non-existent password reset ID returns 404",
    async () => {
      await api.functional.todoApp.password_resets.at(actorConnection, {
        resetId: nonExistentResetId,
      });
    },
  );
}
