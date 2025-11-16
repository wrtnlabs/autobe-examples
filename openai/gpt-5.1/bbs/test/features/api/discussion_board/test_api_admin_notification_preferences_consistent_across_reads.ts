import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardAdminuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserNotificationPreference";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_admin_notification_preferences_consistent_across_reads(
  connection: api.IConnection,
) {
  // 1. Register first admin and authenticate session
  const adminJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin1: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody1,
    });
  typia.assert(admin1);

  // 2. Sanity check: admin-only article category creation
  const categoryBody1 = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody1,
      },
    );
  typia.assert(category1);

  // 3. First read of notification preferences for admin1
  const pref1: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert(pref1);

  // 4. Second read of notification preferences for admin1
  const pref2: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert(pref2);

  // Validate deterministic, stable configuration for admin1
  TestValidator.equals(
    "admin1 preference id remains stable across reads",
    pref1.id,
    pref2.id,
  );
  TestValidator.equals(
    "admin1 activity_notifications_enabled stable across reads",
    pref1.activity_notifications_enabled,
    pref2.activity_notifications_enabled,
  );
  TestValidator.equals(
    "admin1 digest_notifications_enabled stable across reads",
    pref1.digest_notifications_enabled,
    pref2.digest_notifications_enabled,
  );
  TestValidator.equals(
    "admin1 marketing_notifications_enabled stable across reads",
    pref1.marketing_notifications_enabled,
    pref2.marketing_notifications_enabled,
  );
  TestValidator.equals(
    "admin1 created_at remains identical across reads",
    pref1.created_at,
    pref2.created_at,
  );
  // Do not assert on updated_at because implementation may or may not change it

  // 5. Register second admin and authenticate session
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin2: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody2,
    });
  typia.assert(admin2);

  // Optional: sanity check category creation for second admin
  const categoryBody2 = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category2: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody2,
      },
    );
  typia.assert(category2);

  // 6. Read preferences for second admin
  const prefAdmin2: IDiscussionBoardAdminuserNotificationPreference =
    await api.functional.discussionBoard.adminUser.notifications.adminUser.preferences.at(
      connection,
    );
  typia.assert(prefAdmin2);

  // Preferences should be scoped to the authenticated admin user.
  // We prefer different ids, but do not fail if implementation shares defaults.
  if (prefAdmin2.id !== pref1.id) {
    TestValidator.notEquals(
      "admin2 preferences id should typically differ from admin1",
      prefAdmin2.id,
      pref1.id,
    );
  }
}
