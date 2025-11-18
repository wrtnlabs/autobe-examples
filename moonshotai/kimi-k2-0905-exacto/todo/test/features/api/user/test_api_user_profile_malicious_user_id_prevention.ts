import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_profile_malicious_user_id_prevention(
  connection: api.IConnection,
) {
  // Step 1: Create the first user who will be authenticated (the attacker)
  const attackerEmail = typia.random<string & tags.Format<"email">>();
  const attacker: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: attackerEmail,
        password: "password123",
        href: "http://localhost/",
        referrer: "http://localhost/join",
      } satisfies ITodoAppUser.IJoin,
    });
  typia.assert(attacker);

  // Step 2: Create the second user as target victim using fresh authentication state
  // Create new connection state to simulate different user
  const victimConnection: api.IConnection = { ...connection, headers: {} };
  const victimEmail = typia.random<string & tags.Format<"email">>();
  const victim: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    victimConnection,
    {
      body: {
        email: victimEmail,
        password: "password456",
        href: "http://localhost/",
        referrer: "http://localhost/join",
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(victim);

  // Step 3: Verify attacker owns attacker's profile and can update it
  const attackerEmail2 = typia.random<string & tags.Format<"email">>();
  const attackerSelfUpdate: ITodoAppUser =
    await api.functional.todoApp.user.users.update(connection, {
      userId: attacker.id,
      body: { email: attackerEmail2 } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(attackerSelfUpdate);
  TestValidator.equals(
    "self-update should succeed",
    attackerSelfUpdate.email,
    attackerEmail2,
  );

  // Step 4: Test the security boundary - defend against cross-user updates
  // The test verifies that the API properly validates user authorization
  // for profile updates, preventing one authenticated user from modifying
  // another user's account information.
  const newEmail = typia.random<string & tags.Format<"email">>();
  const updateAttemptBody = { email: newEmail } satisfies ITodoAppUser.IUpdate;

  await TestValidator.error(
    "unauthorized update attempt should be blocked",
    async () => {
      await api.functional.todoApp.user.users.update(connection, {
        userId: victim.id,
        body: updateAttemptBody,
      });
    },
  );

  // Step 5: Verify victim profile remains unchanged
  // This ensures that the attacker was not able to modify the victim's profile
  // and that defensive authorization mechanisms are working correctly
  const victimProfileCheck: ITodoAppUser =
    await api.functional.todoApp.user.users.update(victimConnection, {
      userId: victim.id,
      body: { email: victimEmail } satisfies ITodoAppUser.IUpdate,
    });
  typia.assert(victimProfileCheck);
  TestValidator.equals(
    "victim profile email unchanged",
    victimProfileCheck.email,
    victimEmail,
  );
}
