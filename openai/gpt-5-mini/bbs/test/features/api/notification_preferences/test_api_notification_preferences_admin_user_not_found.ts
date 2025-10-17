import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumNotificationPreferences";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate admin retrieval of notification preferences for a non-existent user.
 *
 * Business purpose:
 *
 * - Administrators may need to inspect per-user notification preferences for
 *   support or auditing. When the target user does not exist, the system must
 *   respond safely (error). This test ensures the admin-facing lookup does not
 *   silently succeed or return invalid data for missing users.
 *
 * Steps:
 *
 * 1. Create an administrator account via POST /auth/administrator/join and assert
 *    the returned authorization structure.
 * 2. Generate a random UUID that is not expected to exist in the system.
 * 3. As the administrator, call the admin GET preferences endpoint for that UUID
 *    and assert that the call throws an error (server indicates missing
 *    resource). We use TestValidator.error to assert an error is thrown rather
 *    than asserting raw HTTP status codes per E2E policy.
 */
export async function test_api_notification_preferences_admin_user_not_found(
  connection: api.IConnection,
) {
  // 1) Administrator registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassw0rd!", // >= 10 chars
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(2),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // SDK attaches admin token to connection.headers automatically.

  // 2) Prepare a random UUID that (very likely) does not exist in the test DB
  const nonExistentUserId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Attempt to retrieve preferences for the non-existent user. The
  //    backend is expected to reject the request. Per test framework rules we
  //    assert that an error is thrown instead of inspecting HTTP numeric codes.
  await TestValidator.error(
    "admin retrieving non-existent user preferences should throw",
    async () => {
      await api.functional.econPoliticalForum.administrator.users.notificationPreferences.atNotificationPreferencesByAdmin(
        connection,
        {
          userId: nonExistentUserId,
        },
      );
    },
  );

  // Note: Optional audit log verification could be added here if an audit
  // inspection API is available in the test harness. Teardown is expected to
  // be handled by the test environment (DB reset between tests).
}
