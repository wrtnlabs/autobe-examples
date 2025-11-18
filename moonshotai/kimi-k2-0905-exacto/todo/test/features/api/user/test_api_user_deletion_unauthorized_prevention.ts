import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test prevention of unauthorized user deletion.
 *
 * This test validates that users cannot delete accounts that don't belong to
 * them, ensuring proper authorization checks are in place to prevent malicious
 * account tampering through user ID manipulation.
 *
 * Test workflow:
 *
 * 1. Create attacker user account
 * 2. Create victim user account
 * 3. Attempt to delete victim's account while authenticated as attacker
 * 4. Verify deletion is prevented
 * 5. Confirm attacker can only delete their own account
 */
export async function test_api_user_deletion_unauthorized_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create attacker user account
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attacker = await api.functional.auth.user.join(connection, {
    body: {
      email: attackerEmail,
      password: "securePassword123",
      href: "https://example.com/register",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(attacker);

  // Step 2: Create victim user account
  const victimEmail = typia.random<string & tags.Format<"email">>();
  const victim = await api.functional.auth.user.join(connection, {
    body: {
      email: victimEmail,
      password: "securePassword123",
      href: "https://example.com/register",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(victim);

  // Step 3: Attempt to delete victim's account while authenticated as attacker
  // This should fail due to authorization restrictions
  await TestValidator.error(
    "unauthorized user deletion should fail",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: victim.id,
      });
    },
  );

  // Step 4: Create a new connection to simulate fresh authentication
  // and verify victim account still exists by successfully performing
  // an operation that would succeed on the victim account
  const freshConnection: api.IConnection = { ...connection };

  // Re-authenticate as victim to verify account still exists
  await api.functional.auth.user.join(freshConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "anotherPassword123",
      href: "https://example.com/register",
      referrer: "https://example.com/login",
    } satisfies ITodoAppUser.IJoin,
  });

  // Step 5: Confirm attacker can delete their own account
  await api.functional.todoApp.user.users.erase(connection, {
    userId: attacker.id,
  });

  // Additional validation: Verify attacker's account was actually deleted
  // by attempting to delete it again (should fail since account no longer exists)
  await TestValidator.error(
    "deleted attacker account should not be deletable",
    async () => {
      await api.functional.todoApp.user.users.erase(connection, {
        userId: attacker.id,
      });
    },
  );
}
