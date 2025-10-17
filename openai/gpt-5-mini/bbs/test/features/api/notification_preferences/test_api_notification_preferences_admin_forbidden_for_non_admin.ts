import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_notification_preferences_admin_forbidden_for_non_admin(
  connection: api.IConnection,
) {
  /**
   * Validate that a non-administrator cannot access the administrator-only
   * notification preferences endpoint for another user.
   *
   * Business context:
   *
   * - Notification preferences are sensitive admin-level information.
   * - Only administrator principals should call GET
   *   /econPoliticalForum/administrator/users/{userId}/notificationPreferences.
   * - Regular users must be denied (403 Forbidden). Unauthenticated calls should
   *   also be rejected (401 or 403 depending on policy).
   *
   * Steps:
   *
   * 1. Create an actor (non-admin) account.
   * 2. Create a target registered user (preferences owner).
   * 3. As the actor, attempt to call the admin endpoint for the target user and
   *    assert the call fails with 403.
   * 4. As an unauthenticated client, attempt the same call and assert a 401/403.
   */

  // Create isolated connection clones so join() sets Authorization on the
  // per-user connection without cross-contamination.
  const actorConn: api.IConnection = { ...connection, headers: {} };
  const targetConn: api.IConnection = { ...connection, headers: {} };
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // --- 1) Create actor (non-admin) ---
  const actorBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd1",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(actorConn, {
      body: actorBody,
    });
  typia.assert(actor);

  // --- 2) Create target user (preferences owner) ---
  const targetBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongP@ssw0rd1",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const target: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(targetConn, {
      body: targetBody,
    });
  typia.assert(target);

  // Ensure we have two distinct users
  TestValidator.notEquals(
    "actor and target are distinct users",
    actor.id,
    target.id,
  );

  // --- 3) Actor (non-admin) attempts to access admin endpoint ---
  await TestValidator.httpError(
    "non-admin actor cannot access admin notification preferences",
    403,
    async () => {
      await api.functional.econPoliticalForum.administrator.users.notificationPreferences.atNotificationPreferencesByAdmin(
        actorConn,
        {
          userId: target.id,
        },
      );
    },
  );

  // --- 4) Unauthenticated attempt should also be rejected (401 or 403) ---
  await TestValidator.httpError(
    "anonymous request cannot access admin notification preferences",
    [401, 403],
    async () => {
      await api.functional.econPoliticalForum.administrator.users.notificationPreferences.atNotificationPreferencesByAdmin(
        unauthConn,
        {
          userId: target.id,
        },
      );
    },
  );
}
