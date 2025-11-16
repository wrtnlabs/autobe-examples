import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that admin notification preferences read endpoint reflects the
 * latest state after updates.
 *
 * Business context:
 *
 * - Admin users in the discussion board have a 1:1 notification preference record
 *   controlling three categories of notifications: activity, digest, and
 *   marketing.
 * - The UI typically loads preferences via GET
 *   `/discussionBoard/adminUser/notifications/adminUser/preferences` and
 *   persists changes via PUT on the same path.
 *
 * This test ensures that:
 *
 * 1. After an admin updates their notification preferences via PUT, the subsequent
 *    GET returns those exact flag values.
 * 2. Repeating updates with different combinations of flags always results in the
 *    GET endpoint reflecting the latest persisted state.
 * 3. The same underlying preference record (id) is reused across updates, and
 *    updated_at is refreshed after changes.
 *
 * High-level steps:
 *
 * 1. Join as a new adminUser using POST /auth/adminUser/join.
 * 2. As that adminUser, create an article category to sanity-check admin context
 *    using POST /discussionBoard/adminUser/articleCategories.
 * 3. Perform a first preferences update with a specific boolean combination
 *    (activity=true, digest=true, marketing=false).
 * 4. GET the preferences and assert flag equality and type validity.
 * 5. Perform a second preferences update with a different combination
 *    (activity=false, digest=true, marketing=true).
 * 6. GET the preferences again and assert that the latest flags are reflected, id
 *    is stable, and updated_at has changed.
 */
export async function test_api_admin_notification_preferences_after_external_change(
  connection: api.IConnection,
) {
  // 1. Register a new admin user (join) and get authorized session
  const joinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an article category as this admin to sanity-check
  //    admin-only capabilities and context
  const categoryCreateBody =
    typia.random<IDiscussionBoardArticleCategory.ICreate>();

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. First update of notification preferences
  const firstUpdateBody: IDiscussionBoardAdminuserNotificationPreference.IUpdate =
    {
      activity_notifications_enabled: true,
      digest_notifications_enabled: true,
      marketing_notifications_enabled: false,
    };

  const afterFirstUpdate: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: firstUpdateBody,
      },
    );
  typia.assert(afterFirstUpdate);

  // Capture baseline id and updated_at for later comparison
  const basePreferenceId = afterFirstUpdate.id;
  const baseUpdatedAt = afterFirstUpdate.updated_at;

  // 4. Read preferences immediately after first update
  const afterFirstGet: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert(afterFirstGet);

  // Validate that GET matches the first update payload and id is stable
  TestValidator.equals(
    "id should remain stable after first update/get",
    afterFirstGet.id,
    basePreferenceId,
  );
  TestValidator.equals(
    "activity flag should match first update",
    afterFirstGet.activity_notifications_enabled,
    firstUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest flag should match first update",
    afterFirstGet.digest_notifications_enabled,
    firstUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing flag should match first update",
    afterFirstGet.marketing_notifications_enabled,
    firstUpdateBody.marketing_notifications_enabled,
  );

  // 5. Second update with a different combination of flags
  const secondUpdateBody: IDiscussionBoardAdminuserNotificationPreference.IUpdate =
    {
      activity_notifications_enabled: false,
      digest_notifications_enabled: true,
      marketing_notifications_enabled: true,
    };

  const afterSecondUpdate: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.update(
      connection,
      {
        body: secondUpdateBody,
      },
    );
  typia.assert(afterSecondUpdate);

  // Ensure id is still the same preference record
  TestValidator.equals(
    "id should remain the same across updates",
    afterSecondUpdate.id,
    basePreferenceId,
  );

  // 6. Read preferences again after second update
  const afterSecondGet: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert(afterSecondGet);

  // Validate that GET reflects the second update flags
  TestValidator.equals(
    "activity flag should match second update",
    afterSecondGet.activity_notifications_enabled,
    secondUpdateBody.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest flag should match second update",
    afterSecondGet.digest_notifications_enabled,
    secondUpdateBody.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing flag should match second update",
    afterSecondGet.marketing_notifications_enabled,
    secondUpdateBody.marketing_notifications_enabled,
  );

  // Confirm preference id stability after second GET
  TestValidator.equals(
    "id should remain stable after second update/get",
    afterSecondGet.id,
    basePreferenceId,
  );

  // Optional: updated_at should have advanced at least once compared
  // to the baseline captured after the first update. We only check
  // inequality to avoid assumptions on exact time ordering format.
  TestValidator.notEquals(
    "updated_at should change after at least one subsequent update",
    afterSecondGet.updated_at,
    baseUpdatedAt,
  );
}
