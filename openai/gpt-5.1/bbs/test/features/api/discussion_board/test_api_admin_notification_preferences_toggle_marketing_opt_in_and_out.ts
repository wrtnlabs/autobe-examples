import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";

export async function test_api_admin_notification_preferences_toggle_marketing_opt_in_and_out(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin user via join
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinRequestBody,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 2. Initialize notification preferences with explicit baseline values
  const baselineActivityEnabled = true;
  const baselineDigestEnabled = false;
  const baselineMarketingEnabled = false;

  const initialPreferences =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          activity_notifications_enabled: baselineActivityEnabled,
          digest_notifications_enabled: baselineDigestEnabled,
          marketing_notifications_enabled: baselineMarketingEnabled,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(
    initialPreferences,
  );

  // Validate baseline flags
  TestValidator.equals(
    "initial activity flag matches baseline",
    initialPreferences.activity_notifications_enabled,
    baselineActivityEnabled,
  );
  TestValidator.equals(
    "initial digest flag matches baseline",
    initialPreferences.digest_notifications_enabled,
    baselineDigestEnabled,
  );
  TestValidator.equals(
    "initial marketing flag matches baseline",
    initialPreferences.marketing_notifications_enabled,
    baselineMarketingEnabled,
  );

  const preferenceId = initialPreferences.id;
  const createdAt = initialPreferences.created_at;
  const initialUpdatedAt = initialPreferences.updated_at;

  // 3. Toggle marketing opt-in: false -> true, only sending marketing flag
  const optInPreferences =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          marketing_notifications_enabled: true,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(
    optInPreferences,
  );

  // Validate that id and created_at are stable, updated_at may change
  TestValidator.equals(
    "opt-in preferences keep same id",
    optInPreferences.id,
    preferenceId,
  );
  TestValidator.equals(
    "opt-in preferences keep same created_at",
    optInPreferences.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "opt-in preferences updated_at should change",
    optInPreferences.updated_at,
    initialUpdatedAt,
  );

  // Validate flags after opt-in
  TestValidator.equals(
    "after opt-in activity flag unchanged",
    optInPreferences.activity_notifications_enabled,
    baselineActivityEnabled,
  );
  TestValidator.equals(
    "after opt-in digest flag unchanged",
    optInPreferences.digest_notifications_enabled,
    baselineDigestEnabled,
  );
  TestValidator.equals(
    "after opt-in marketing flag true",
    optInPreferences.marketing_notifications_enabled,
    true,
  );

  const optInUpdatedAt = optInPreferences.updated_at;

  // 4. Toggle marketing opt-out: true -> false, again only sending marketing flag
  const optOutPreferences =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          marketing_notifications_enabled: false,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(
    optOutPreferences,
  );

  // Validate that id and created_at are still stable, updated_at should change again
  TestValidator.equals(
    "opt-out preferences keep same id",
    optOutPreferences.id,
    preferenceId,
  );
  TestValidator.equals(
    "opt-out preferences keep same created_at",
    optOutPreferences.created_at,
    createdAt,
  );
  TestValidator.notEquals(
    "opt-out preferences updated_at should change again",
    optOutPreferences.updated_at,
    optInUpdatedAt,
  );

  // Validate flags after opt-out
  TestValidator.equals(
    "after opt-out activity flag unchanged",
    optOutPreferences.activity_notifications_enabled,
    baselineActivityEnabled,
  );
  TestValidator.equals(
    "after opt-out digest flag unchanged",
    optOutPreferences.digest_notifications_enabled,
    baselineDigestEnabled,
  );
  TestValidator.equals(
    "after opt-out marketing flag false",
    optOutPreferences.marketing_notifications_enabled,
    false,
  );

  // 5. Optional: one more toggle to confirm consistent flipping behavior
  const optInAgainPreferences =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: {
          marketing_notifications_enabled: true,
        } satisfies IDiscussionBoardAdminuserNotificationPreference.IUpdate,
      },
    );
  typia.assert<IDiscussionBoardAdminuserNotificationPreference>(
    optInAgainPreferences,
  );

  TestValidator.equals(
    "opt-in again keeps same id",
    optInAgainPreferences.id,
    preferenceId,
  );
  TestValidator.equals(
    "opt-in again keeps same created_at",
    optInAgainPreferences.created_at,
    createdAt,
  );
  TestValidator.equals(
    "opt-in again activity flag unchanged",
    optInAgainPreferences.activity_notifications_enabled,
    baselineActivityEnabled,
  );
  TestValidator.equals(
    "opt-in again digest flag unchanged",
    optInAgainPreferences.digest_notifications_enabled,
    baselineDigestEnabled,
  );
  TestValidator.equals(
    "opt-in again marketing flag true",
    optInAgainPreferences.marketing_notifications_enabled,
    true,
  );
}
