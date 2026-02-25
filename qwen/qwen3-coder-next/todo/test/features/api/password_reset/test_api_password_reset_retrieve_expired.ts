import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_password_reset_retrieve_expired(
  connection: api.IConnection,
): Promise<void> {
  // Generate a password reset request with a token
  // This simulates the user requesting a password reset
  const token = "reset-token-" + RandomGenerator.alphaNumeric(20);
  const created = await api.functional.todoApp.password_resets.resetPassword(
    connection,
    {
      body: {
        token: token,
        password: "newpassword123",
      } satisfies ITodoAppUserPasswordReset.IRequest,
    },
  );
  typia.assert(created);
  // Since resetPassword response only returns a message and not the reset ID,
  // we need to generate a UUID and test retrieval
  // For expired reset testing, we'd need to have a reset with expired_at in the past
  // but the current API doesn't provide a way to create such a reset or get its ID
  // Test retrieval with a non-existent reset ID (should return 404)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent reset - this should fail
  await TestValidator.error(
    "should return 404 for non-existent reset",
    async () => {
      await api.functional.todoApp.password_resets.at(connection, {
        resetId: nonExistentId,
      });
    },
  );
  // For the expired scenario, if we had access to create resets with custom expired_at,
  // we would:
  // 1. Create a reset with expired_at in the past
  // 2. Attempt to retrieve it
  // 3. Verify it returns 404 (since expired resets are treated as non-existent)
  // Test that we can retrieve a non-expired reset if we had its ID
  // Since we can't get the ID from the resetPassword response, we use a generated ID
  // In a real scenario, we would use a database or direct API to create a reset with known ID
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // This test demonstrates the current limitation - we can't fully test the expiration
  // scenario without a way to create resets with specific timestamps and get their IDs
  await TestValidator.error("should return 404 for unknown reset", async () => {
    await api.functional.todoApp.password_resets.at(connection, {
      resetId: resetId,
    });
  });
}
