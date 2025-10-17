import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_notification_preferences_update_by_owner_success(
  connection: api.IConnection,
) {
  // Create a realistic registered user via the public join endpoint.
  const joinBody = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!23",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  // Validate the authorized response shape.
  typia.assert(authorized);

  // Prepare update payload for notification preferences.
  const preferencesPayload = { digestInterval: "daily" };
  const updateBody = {
    in_app: true,
    email: false,
    push: true,
    preferences_payload: JSON.stringify(preferencesPayload),
  } satisfies IEconPoliticalForumNotificationPreferences.IUpdate;

  // Execute update using the authenticated connection (SDK sets Authorization on join).
  const updated: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.update(
      connection,
      {
        userId: authorized.id,
        body: updateBody,
      },
    );

  // Validate response type and basic properties.
  typia.assert(updated);

  // Business-level validations
  TestValidator.equals(
    "preferences belong to created user",
    updated.registereduser_id,
    authorized.id,
  );

  TestValidator.equals("in_app flag persisted", updated.in_app, true);
  TestValidator.equals("email flag persisted", updated.email, false);
  TestValidator.equals("push flag persisted", updated.push, true);

  // preferences_payload may be optional in the response; compare strings when present
  TestValidator.equals(
    "preferences_payload persisted",
    updated.preferences_payload ?? null,
    updateBody.preferences_payload,
  );

  // Validate timestamps: updated_at should be parseable and recent (within last 5 minutes)
  TestValidator.predicate(
    "updated_at is recent",
    (() => {
      try {
        const ms = Date.parse(updated.updated_at);
        if (Number.isNaN(ms)) return false;
        const now = Date.now();
        return ms <= now && ms >= now - 5 * 60 * 1000;
      } catch {
        return false;
      }
    })(),
  );

  // Note: Audit log verification (action_type='update_notification_preferences')
  // is not implementable with the provided SDK functions. To validate audit
  // logging one would need an audit-read API or direct DB access; such an API
  // was not provided. This test therefore validates observable effects of the
  // update (ownership, persisted flags, and timestamps) as a practical
  // equivalent.
}
