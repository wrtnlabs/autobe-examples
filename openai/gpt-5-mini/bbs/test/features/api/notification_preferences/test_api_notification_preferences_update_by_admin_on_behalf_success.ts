import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_notification_preferences_update_by_admin_on_behalf_success(
  connection: api.IConnection,
) {
  /**
   * Purpose: Verify that an administrator can update another registered user's
   * notification preferences via PUT
   * /econPoliticalForum/registeredUser/users/{userId}/notificationPreferences
   * and that the API returns the persisted preference record referencing the
   * correct registered user.
   *
   * Important limitation: The provided SDK does not expose an audit-log read
   * API or direct DB inspection endpoints. Therefore this test verifies the
   * persisted preference values via the update response and ensures the actor
   * is an administrator (admin.id differs from target user id). If an audit-log
   * endpoint becomes available, additional assertions should be added to
   * validate the 'update_notification_preferences' audit entry.
   */

  // 1) Create the target registered user
  const registeredBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminTest!2345",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const targetUser: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: registeredBody,
    });
  typia.assert(targetUser);

  // 2) Create administrator (the SDK will set connection.headers.Authorization
  // to admin.token.access)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!2345",
    username: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Ensure that admin is a different identity than the target user
  TestValidator.notEquals(
    "admin and target user must differ",
    admin.id,
    targetUser.id,
  );

  // 3) Prepare preference update payload (use valid DTO shape)
  const prefsBody = {
    in_app: true,
    email: false,
    push: true,
    preferences_payload: JSON.stringify({ mentions: { email: false } }),
  } satisfies IEconPoliticalForumNotificationPreferences.IUpdate;

  // 4) Execute update as admin
  const updated: IEconPoliticalForumNotificationPreferences =
    await api.functional.econPoliticalForum.registeredUser.users.notificationPreferences.update(
      connection,
      {
        userId: targetUser.id,
        body: prefsBody,
      },
    );
  typia.assert(updated);

  // 5) Business assertions
  TestValidator.equals(
    "updated preference belongs to target user",
    updated.registereduser_id,
    targetUser.id,
  );

  TestValidator.equals("in_app persisted", updated.in_app, prefsBody.in_app);
  TestValidator.equals("email persisted", updated.email, prefsBody.email);
  TestValidator.equals("push persisted", updated.push, prefsBody.push);
  TestValidator.equals(
    "preferences_payload persisted",
    updated.preferences_payload,
    prefsBody.preferences_payload,
  );

  TestValidator.predicate(
    "updated_at present",
    updated.updated_at !== null && updated.updated_at !== undefined,
  );

  // Note: Audit-log verification is omitted due to lack of SDK endpoint.
}
