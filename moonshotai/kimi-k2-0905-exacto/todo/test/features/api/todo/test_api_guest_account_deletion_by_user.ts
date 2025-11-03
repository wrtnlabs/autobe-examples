import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoGuest";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Test guest account deletion by an authenticated user.
 *
 * This test validates the complete workflow of managing temporary guest
 * sessions:
 *
 * 1. First, create an authenticated user account to perform deletion operations
 * 2. Create a temporary guest session for demonstration purposes
 * 3. Delete the guest account using the authenticated user's permissions
 * 4. Verify the deletion operation completes successfully without errors
 */
export async function test_api_guest_account_deletion_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register as an authenticated user to perform guest deletion
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphabets(10);

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies ITodoUser.IJoin,
  });
  typia.assert(user);

  TestValidator.equals("verified user registration", user.email, userEmail);
  TestValidator.predicate(
    "user has authentication token",
    user.token.access.length > 0,
  );

  // Step 2: Create a temporary guest session for demonstration
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const guest = await api.functional.todo.guests.create(connection, {
    body: {
      href: href,
      referrer: referrer,
      ip: "192.168.1.1",
    } satisfies ITodoGuest.ICreate,
  });
  typia.assert(guest);

  TestValidator.predicate("guest creation successful", guest.id.length > 0);
  TestValidator.predicate(
    "guest has creation timestamp",
    guest.created_at.length > 0,
  );

  // Step 3: Delete the guest account using authenticated user permissions
  await api.functional.todo.user.guests.erase(connection, {
    guestId: guest.id,
  });

  // Step 4: Verify deletion was successful by checking we can't delete the same guest again
  await TestValidator.error(
    "guest deletion prevents duplicate deletion",
    async () => {
      await api.functional.todo.user.guests.erase(connection, {
        guestId: guest.id,
      });
    },
  );
}
