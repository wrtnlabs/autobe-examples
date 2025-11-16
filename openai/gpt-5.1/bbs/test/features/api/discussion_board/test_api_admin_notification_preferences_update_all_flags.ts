import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";

/**
 * Validate updating all notification preference flags for an authenticated
 * admin user.
 *
 * Business goals:
 *
 * - Ensure a newly joined adminUser can update their notification preferences via
 *   the dedicated PUT endpoint.
 * - Validate that all three boolean flags (activity, digest, marketing) are
 *   applied atomically – the stored record reflects exactly what was sent in
 *   each request.
 * - Confirm that the preference record is stable across multiple updates (same id
 *   and created_at, updated_at changes).
 *
 * Scenario:
 *
 * 1. Join as a new admin user using /auth/adminUser/join.
 * 2. Perform a first preferences update with a specific combination of flags.
 * 3. Perform a second preferences update with a different combination of flags.
 * 4. Verify that each response matches the sent body, that the same record is
 *    updated, and that timestamps behave consistently.
 */
export async function test_api_admin_notification_preferences_update_all_flags(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (and establish authenticated context).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(admin);

  TestValidator.predicate(
    "admin access token should be non-empty",
    admin.token.access.length > 0,
  );

  // 2. First preferences update: set a specific combination.
  const firstUpdateBody = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: false,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const pref1: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(pref1);

  TestValidator.equals(
    "activity flag after first update matches request",
    pref1.activity_notifications_enabled,
    firstUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest flag after first update matches request",
    pref1.digest_notifications_enabled,
    firstUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing flag after first update matches request",
    pref1.marketing_notifications_enabled,
    firstUpdateBody.marketing_notifications_enabled,
  );

  // 3. Second preferences update: change all flags to a different combination.
  const secondUpdateBody = {
    activity_notifications_enabled: false,
    digest_notifications_enabled: true,
    marketing_notifications_enabled: true,
  } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate;

  const pref2: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(pref2);

  // Validate flags reflect exactly the second request body.
  TestValidator.equals(
    "activity flag after second update matches request",
    pref2.activity_notifications_enabled,
    secondUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest flag after second update matches request",
    pref2.digest_notifications_enabled,
    secondUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing flag after second update matches request",
    pref2.marketing_notifications_enabled,
    secondUpdateBody.marketing_notifications_enabled,
  );

  // Validate that we are updating the same record, not creating a new one.
  TestValidator.equals(
    "preference id remains stable across updates",
    pref2.id,
    pref1.id,
  );

  // created_at should remain the same; updated_at should change.
  TestValidator.equals(
    "created_at remains unchanged after update",
    pref2.created_at,
    pref1.created_at,
  );
  TestValidator.notEquals(
    "updated_at advances after second update",
    pref2.updated_at,
    pref1.updated_at,
  );
}
