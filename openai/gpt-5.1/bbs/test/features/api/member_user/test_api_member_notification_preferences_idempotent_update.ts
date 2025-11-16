import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardMemberuserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserNotificationPreference";

/**
 * Verify idempotent update behavior for member notification preferences.
 *
 * Business context: A discussion-board member user can configure notification
 * preferences for activity, digest, and marketing messages. These settings are
 * stored in the `discussion_board_memberuser_notification_preferences` table in
 * a strict 1:1 relation with the member user. The preferences update endpoint
 * implements PUT semantics: applying the same payload repeatedly must not
 * create duplicate preference rows and must keep the preference state stable.
 *
 * This test simulates a realistic multi-actor flow:
 *
 * 1. A member user joins the service and becomes authenticated.
 * 2. An admin user joins and creates a discussion category.
 * 3. The member user creates an article under that category (to model some prior
 *    activity before configuring preferences).
 * 4. The member user updates their notification preferences with a specific
 *    combination of boolean flags.
 * 5. The same preferences update payload is sent again via PUT.
 *
 * The test then validates that:
 *
 * - The preference record id is stable across repeated identical updates.
 * - The preference record remains associated with the same member user.
 * - All notification flags reflect the requested values after both updates.
 * - The created_at timestamp does not change between calls (record not
 *   re-created) and updated_at is monotonic (second value is greater than or
 *   equal to the first), allowing implementations that refresh timestamps on
 *   idempotent writes.
 */
export async function test_api_member_notification_preferences_idempotent_update(
  connection: api.IConnection,
) {
  // 1. Member joins and becomes authenticated.
  const memberJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(memberAuthorized);

  // Capture member id for later ownership verification.
  const memberId = memberAuthorized.id;

  // 2. Admin joins and becomes authenticated (overwriting connection auth).
  const adminJoinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(20),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 3. Admin creates an article category required by article creation.
  const categoryCreateRequest = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateRequest,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(category);

  // 4. Switch back to member authentication using login.
  const memberLoginRequest = {
    email: memberJoinRequest.email,
    password: memberJoinRequest.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginRequest,
    });
  typia.assert<IDiscussionBoardMemberuser.IAuthorized>(memberLoggedIn);

  // Sanity check: same member id after login.
  TestValidator.equals(
    "member id is stable between join and login",
    memberLoggedIn.id,
    memberId,
  );

  // 5. Member creates an article under the created category.
  const articleCreateRequest = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateRequest,
      },
    );
  typia.assert<IDiscussionBoardArticle>(article);

  // 6. Construct a concrete notification preference payload.
  const preferencePayload = {
    activity_notifications_enabled: true,
    digest_notifications_enabled: false,
    marketing_notifications_enabled: true,
  } satisfies IDiscussionBoardMemberuserNotificationPreference.IUpdate;

  // 7. First PUT update call.
  const firstPreference: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.update(
      connection,
      {
        body: preferencePayload,
      },
    );
  typia.assert<IDiscussionBoardMemberuserNotificationPreference>(
    firstPreference,
  );

  // 8. Second PUT update call with the same payload.
  const secondPreference: IDiscussionBoardMemberuserNotificationPreference =
    await api.functional.discussionBoard.memberUser.notifications.memberUser.preferences.update(
      connection,
      {
        body: preferencePayload,
      },
    );
  typia.assert<IDiscussionBoardMemberuserNotificationPreference>(
    secondPreference,
  );

  // 9. Idempotency assertions.

  // 9-1. Same preference record id.
  TestValidator.equals(
    "preference id is stable across identical PUTs",
    secondPreference.id,
    firstPreference.id,
  );

  // 9-2. Preference owner matches authenticated member.
  TestValidator.equals(
    "preference owner matches authenticated member id (first)",
    firstPreference.discussion_board_memberuser_id,
    memberId,
  );
  TestValidator.equals(
    "preference owner matches authenticated member id (second)",
    secondPreference.discussion_board_memberuser_id,
    memberId,
  );

  // 9-3. Flag values match payload after both updates.
  TestValidator.equals(
    "activity_notifications_enabled matches payload after first update",
    firstPreference.activity_notifications_enabled,
    preferencePayload.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest_notifications_enabled matches payload after first update",
    firstPreference.digest_notifications_enabled,
    preferencePayload.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing_notifications_enabled matches payload after first update",
    firstPreference.marketing_notifications_enabled,
    preferencePayload.marketing_notifications_enabled,
  );

  TestValidator.equals(
    "activity_notifications_enabled matches payload after second update",
    secondPreference.activity_notifications_enabled,
    preferencePayload.activity_notifications_enabled,
  );
  TestValidator.equals(
    "digest_notifications_enabled matches payload after second update",
    secondPreference.digest_notifications_enabled,
    preferencePayload.digest_notifications_enabled,
  );
  TestValidator.equals(
    "marketing_notifications_enabled matches payload after second update",
    secondPreference.marketing_notifications_enabled,
    preferencePayload.marketing_notifications_enabled,
  );

  // 9-4. created_at must be stable (no new row created).
  TestValidator.equals(
    "created_at is stable across identical PUTs",
    secondPreference.created_at,
    firstPreference.created_at,
  );

  // 9-5. updated_at must be monotonic (second >= first).
  const firstUpdatedAt = new Date(firstPreference.updated_at).getTime();
  const secondUpdatedAt = new Date(secondPreference.updated_at).getTime();

  TestValidator.predicate(
    "updated_at is monotonic across identical PUTs",
    secondUpdatedAt >= firstUpdatedAt,
  );
}
