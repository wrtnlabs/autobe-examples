import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_notification_preferences_admin_retrieval_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify that an administrator can read another user's notification
   *   preferences that the user has previously set.
   * - Ensure the returned payload is sanitized (no sensitive fields) and that the
   *   values match those previously persisted by the user.
   *
   * Steps:
   *
   * 1. Create isolated connections for user and admin so tokens don't clobber one
   *    another.
   * 2. Register a new user (POST /auth/registeredUser/join) -> capture user.id.
   * 3. Register a new admin (POST /auth/administrator/join) -> capture admin.id.
   * 4. Using user connection, PUT notification preferences for the created user.
   * 5. Using admin connection, GET the preferences for that user via the
   *    admin-scoped endpoint and validate values and sanitation.
   */

  // 1) Prepare isolated connection objects to avoid header/token clashes.
  const userConn: api.IConnection = { ...connection, headers: {} };
  const adminConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create a registered user (owner of preferences)
  const userJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const user: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(userConn, {
      body: userJoinBody,
    });
  typia.assert(user);

  // 3) Create an administrator account
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(adminConn, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 4) As the registered user, set notification preferences
  const preferencesPayload = JSON.stringify({ digestInterval: "daily" });
  const prefsBody = {
    in_app: true,
    email: false,
    push: true,
    preferences_payload: preferencesPayload,
  } satisfies IEconPoliticalForumNotificationPreferences.IUpdate;

  const updated: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.update(
      userConn,
      {
        userId: user.id,
        body: prefsBody,
      },
    );
  typia.assert(updated);

  // Business-logic assertions for the update result
  TestValidator.equals(
    "preferences: owner id matches",
    updated.registereduser_id,
    user.id,
  );
  TestValidator.equals(
    "preferences: in_app equals set value",
    updated.in_app,
    true,
  );
  TestValidator.equals(
    "preferences: email equals set value",
    updated.email,
    false,
  );
  TestValidator.equals(
    "preferences: push equals set value",
    updated.push,
    true,
  );
  TestValidator.equals(
    "preferences: payload persisted",
    updated.preferences_payload,
    preferencesPayload,
  );

  // 5) As admin, retrieve the user's preferences
  const retrieved: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.administrator.users.notificationPreferences.atNotificationPreferencesByAdmin(
      adminConn,
      {
        userId: user.id,
      },
    );
  typia.assert(retrieved);

  // Validate the admin-retrieved object matches the updated record
  TestValidator.equals(
    "admin retrieved: registereduser_id matches",
    retrieved.registereduser_id,
    user.id,
  );
  TestValidator.equals(
    "admin retrieved: full record matches update",
    retrieved,
    updated,
  );

  // Ensure no sensitive server-side-only fields are exposed in the admin response.
  // We check for common sensitive property names that must not appear. Since
  // the DTO does not include these properties, this predicate verifies they
  // were not accidentally leaked into the response object.
  TestValidator.predicate(
    "admin retrieved: no sensitive fields (password_hash)",
    !Object.prototype.hasOwnProperty.call(retrieved, "password_hash"),
  );

  // Audit verification note:
  // The provided SDK materials did not include an audit-log listing or query
  // API. Because inventing a non-existent admin audit endpoint would violate
  // the schema rules, we cannot perform an in-test audit lookup here. In a
  // full integration harness, verify that an immutable audit entry was
  // created for the admin read (acting admin id, target user id, endpoint,
  // timestamp) via the platform's audit export or admin-only audit listing.
  TestValidator.predicate("audit verification not available in harness", true);
}
