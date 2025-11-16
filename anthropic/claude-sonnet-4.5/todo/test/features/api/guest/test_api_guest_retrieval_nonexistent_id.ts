import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test the system's behavior when an administrator attempts to retrieve a guest
 * visitor record using a non-existent UUID.
 *
 * This test validates proper error handling for invalid guest IDs, ensuring the
 * API returns appropriate error responses when the requested guest record does
 * not exist in the database. This is an important edge case that verifies the
 * system correctly handles missing resources and provides meaningful error
 * feedback.
 *
 * Test workflow:
 *
 * 1. Authenticate as administrator to gain necessary permissions
 * 2. Generate a random UUID that doesn't exist in the database
 * 3. Attempt to retrieve guest record with the non-existent ID
 * 4. Verify that the API throws an error as expected
 */
export async function test_api_guest_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Generate a non-existent guest ID (random UUID)
  const nonExistentGuestId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to retrieve guest with non-existent ID and expect error
  await TestValidator.error(
    "retrieving non-existent guest should throw error",
    async () => {
      await api.functional.todoList.admin.guests.at(connection, {
        guestId: nonExistentGuestId,
      });
    },
  );
}
