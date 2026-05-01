import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test password reset completion with a non-existent reset ID.
 *
 * Attempts to complete a password reset using a randomly generated UUID that has never been associated with any password reset record in the system. Verifies the endpoint correctly rejects the request with a 404 Not Found status, ensuring that only valid, existing reset tokens can be consumed.
 *
 * This test validates the server-side behavior described in the implementation steps: looking up the password reset record by {resetId} should fail when no matching record exists, returning a 404 error. The password in the request body is otherwise valid — the rejection is solely due to the non-existent token identifier.
 *
 * 1. Generate a random UUID for the resetId parameter that does not correspond to any existing reset record.
 * 2. Generate a valid password body meeting the system's password format requirements.
 * 3. Call the password reset completion endpoint with the non-existent resetId.
 * 4. Verify the system responds with a 404 Not Found error.
 */
export async function test_api_password_reset_complete_nonexistent_reset(
  connection: api.IConnection,
): Promise<void> {
  await TestValidator.httpError(
    "non-existent reset ID returns 404",
    404,
    async () => {
      await api.functional.todoApp.password_resets.update(connection, {
        resetId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<ITodoAppMemberPasswordReset.IUpdate>(),
      });
    },
  );
}
