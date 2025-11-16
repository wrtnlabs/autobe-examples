import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";

/**
 * Validate partial update behavior of admin notification preferences.
 *
 * Business goal: Ensure that the admin notification preference endpoint (PUT
 * /discussionBoard/adminUser/notifications/adminUser/preferences) correctly
 * treats omitted fields as "no change" while updating only the provided flags
 * for the currently authenticated admin user.
 *
 * Test steps:
 *
 * 1. Register a new admin user via POST /auth/adminUser/join using a randomized
 *    but valid payload (IDiscussionBoardAdminUserJoin.IRequest). The SDK will
 *    automatically attach the returned access token to the connection headers.
 * 2. Perform an initial preferences.update call supplying all three boolean flags
 *    explicitly to establish a known baseline configuration for this admin:
 *
 *    - Activity_notifications_enabled: true
 *    - Digest_notifications_enabled: false
 *    - Marketing_notifications_enabled: false Capture the returned
 *         IDiscussionBoardAdminuserNotificationPreference object as `baseline`
 *         and validate it with typia.assert.
 * 3. Perform a second preferences.update call with a partial body that only
 *    includes activity_notifications_enabled and flips it to false, omitting
 *    digest_notifications_enabled and marketing_notifications_enabled entirely.
 *    Capture the response as `partial1` and validate it with typia.assert.
 *
 *    Business assertions (using TestValidator):
 *
 *    - "activity flag updated": partial1.activity_notifications_enabled should equal
 *         false, and differ from baseline.activity_notifications_enabled.
 *    - "digest flag unchanged": partial1.digest_notifications_enabled should equal
 *         baseline.digest_notifications_enabled.
 *    - "marketing flag unchanged": partial1.marketing_notifications_enabled should
 *         equal baseline.marketing_notifications_enabled.
 *    - "createdAt stable across updates": partial1.created_at should equal
 *         baseline.created_at.
 *    - "updatedAt advanced after partial update": partial1.updated_at should
 *         represent a later or equal time than baseline.updated_at, and in
 *         practice should be strictly greater for a successful modification. We
 *         compare the ISO date-time strings by converting to milliseconds.
 * 4. Optionally, execute a third preferences.update call that only toggles
 *    marketing_notifications_enabled to true, leaving
 *    activity_notifications_enabled and digest_notifications_enabled omitted.
 *    Capture the response as `partial2` and validate:
 *
 *    - Marketing flag changed from previous value to true.
 *    - Activity and digest flags remain equal to partial1 values.
 *    - Created_at remains equal to baseline.created_at.
 *    - Updated_at has advanced relative to partial1.updated_at.
 *
 * This test does not attempt to validate cross-user isolation because no
 * additional admin accounts or a GET endpoint are provided in the current SDK
 * fragment. Instead, it focuses on per-field partial update semantics and
 * timestamp behavior for a single authenticated admin.
 */
export async function test_api_admin_notification_preferences_partial_update(
  connection: api.IConnection,
) {
  // 1. Register a new admin user and obtain an authenticated connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const authorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Establish a baseline notification preference configuration
  const baseline: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          activity_notifications_enabled: true,
          digest_notifications_enabled: false,
          marketing_notifications_enabled: false,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert(baseline);

  // 3. Perform a partial update: change only activity_notifications_enabled
  const partial1: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          activity_notifications_enabled: false,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert(partial1);

  // Validate activity flag changed, others unchanged
  TestValidator.equals(
    "activity flag updated to false",
    partial1.activity_notifications_enabled,
    false,
  );
  TestValidator.notEquals(
    "activity flag differs from baseline",
    partial1.activity_notifications_enabled,
    baseline.activity_notifications_enabled,
  );

  TestValidator.equals(
    "digest flag unchanged after partial update",
    partial1.digest_notifications_enabled,
    baseline.digest_notifications_enabled,
  );

  TestValidator.equals(
    "marketing flag unchanged after partial update",
    partial1.marketing_notifications_enabled,
    baseline.marketing_notifications_enabled,
  );

  // Validate created_at is stable and updated_at has advanced
  TestValidator.equals(
    "created_at remains constant across updates",
    partial1.created_at,
    baseline.created_at,
  );

  const baselineUpdatedAt = Date.parse(baseline.updated_at);
  const partial1UpdatedAt = Date.parse(partial1.updated_at);

  TestValidator.predicate(
    "updated_at should advance after first partial update",
    partial1UpdatedAt >= baselineUpdatedAt,
  );

  // 4. Optional second partial update: toggle marketing_notifications_enabled only
  const partial2: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          marketing_notifications_enabled: true,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert(partial2);

  // Marketing flag changed, activity and digest unchanged from partial1
  TestValidator.equals(
    "marketing flag updated to true",
    partial2.marketing_notifications_enabled,
    true,
  );
  TestValidator.notEquals(
    "marketing flag differs from previous value",
    partial2.marketing_notifications_enabled,
    partial1.marketing_notifications_enabled,
  );

  TestValidator.equals(
    "activity flag unchanged in second partial update",
    partial2.activity_notifications_enabled,
    partial1.activity_notifications_enabled,
  );

  TestValidator.equals(
    "digest flag unchanged in second partial update",
    partial2.digest_notifications_enabled,
    partial1.digest_notifications_enabled,
  );

  // Timestamp semantics: created_at stable, updated_at advanced again
  TestValidator.equals(
    "created_at remains constant after second partial update",
    partial2.created_at,
    baseline.created_at,
  );

  const partial2UpdatedAt = Date.parse(partial2.updated_at);

  TestValidator.predicate(
    "updated_at should advance after second partial update",
    partial2UpdatedAt >= partial1UpdatedAt,
  );
}
