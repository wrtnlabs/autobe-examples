import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_notification_preferences_update_by_other_user_forbidden(
  connection: api.IConnection,
) {
  /**
   * Purpose: Ensure that one registered user cannot update another user's
   * notification preferences (ownership enforcement). This test performs a
   * negative check (non-owner update attempt should throw) and a positive
   * control (owner can update their own preferences).
   *
   * Notes:
   *
   * - The test relies on the SDK-provided join() and update() functions only.
   * - There is no GET/list preferences API in the provided SDK; therefore the
   *   test cannot directly assert DB state. The negative-case error plus the
   *   successful owner update serve as sufficient validation of ownership
   *   enforcement for this test scope.
   */

  // Create two isolated connection instances so join() sets different tokens
  const actorConn: api.IConnection = { ...connection, headers: {} };
  const targetConn: api.IConnection = { ...connection, headers: {} };

  // Register actor (user A)
  const actor: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(actorConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password!2345",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(actor);

  // Register target (user B)
  const target: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(targetConn, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password!2345",
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(target);

  // Valid update payload (IUpdate)
  const updateBody = {
    in_app: false,
    email: false,
    push: false,
  } satisfies IEconPoliticalForumNotificationPreferences.IUpdate;

  // Negative case: actor (non-owner) attempts to update target's prefs → expect error
  await TestValidator.error(
    "other user cannot update preferences",
    async () => {
      await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.update(
        actorConn,
        {
          userId: target.id,
          body: updateBody,
        },
      );
    },
  );

  // Positive control: target (owner) updates their own preferences → expect success
  const updated: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.update(
      targetConn,
      {
        userId: target.id,
        body: {
          in_app: true,
          email: true,
          push: true,
        } satisfies IEconPoliticalForumNotificationPreferences.IUpdate,
      },
    );
  typia.assert(updated);

  // Business-level assertion: updated preference belongs to the expected user
  TestValidator.equals(
    "owner update recorded for correct user",
    updated.registereduser_id,
    target.id,
  );
}
