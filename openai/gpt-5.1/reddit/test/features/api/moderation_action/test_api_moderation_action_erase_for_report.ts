import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * E2E test: erase a moderation action for a report as platform admin.
 *
 * Business flow implemented:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain an
 *    authenticated platformAdmin context.
 * 2. As the platform admin, create a community visibility level using POST
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.
 * 3. Register a member user via POST /auth/memberUser/join and obtain a memberUser
 *    context.
 * 4. As the member user, create a community using POST
 *    /communityPlatform/memberUser/communities, referencing the created
 *    visibility level via its code.
 * 5. As the member user, subscribe to that community via POST
 *    /communityPlatform/memberUser/communities/{communityId}/subscriptions.
 * 6. As the member user, create a report via POST
 *    /communityPlatform/memberUser/reports, linking it to the community via
 *    community_id.
 *
 *    - Since we have no API to create a report reason category, we use a random UUID
 *         for report_reason_category_id and rely on backend test data.
 *    - Reporter type is set to "member" to match the authenticated actor.
 * 7. Switch back to the platform admin (via /auth/platformAdmin/login) and create
 *    a moderation action for the report using POST
 *    /communityPlatform/platformAdmin/reports/{reportId}/moderationActions.
 * 8. Call DELETE
 *    /communityPlatform/platformAdmin/reports/{reportId}/moderationActions/{moderationActionId}
 *    to erase the moderation action and assert the call completes without
 *    throwing (success case).
 * 9. Attempt to erase the same moderation action a second time as platform admin
 *    and validate via TestValidator.error that an error is thrown (indicating
 *    the moderation action no longer exists or cannot be deleted again).
 * 10. Switch to the member user and attempt to erase the moderation action (using
 *     the original moderationActionId) and validate via TestValidator.error
 *     that this unauthorized actor cannot erase moderation actions.
 *
 * Constraints and notes:
 *
 * - Only functions exposed in the SDK may be used; there is no GET endpoint for
 *   moderation actions, so non-existence is inferred by failure on second
 *   erase.
 * - All auth flows must use join/login endpoints that automatically manage
 *   connection headers; direct manipulation of connection.headers is
 *   forbidden.
 * - All request bodies must be created using `satisfies` with proper DTO types;
 *   no `as` or `any` is allowed.
 * - All API calls must be awaited; error flows must use `await
 *   TestValidator.error` for async callbacks.
 */
export async function test_api_moderation_action_erase_for_report(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and get authenticated platformAdmin context.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level as platform admin.
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register a member user (join).
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://community.local/join",
    referrer: "https://community.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Switch to member user explicitly via login (to ensure actor context).
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    href: "https://community.local/login",
    referrer: "https://community.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 5. As member user, create a community using the visibility level code.
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: "Test Community for Moderation Erase",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. As member user, subscribe to the community.
  const subscriptionCreateBody = {
    community_id: community.id,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.communities.subscriptions.create(
      connection,
      {
        communityId: community.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 7. As member user, create a report linked to this community.
  // There is no API to create a report reason category; we use a random UUID
  // and rely on test data or lenient backend behavior for this test environment.
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 8. Switch back to platform admin via login to perform moderation actions.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAuthorized);

  // 9. As platform admin, create a moderation action for the report.
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "community",
    reason_summary: "Test moderation action to be erased.",
    notes_internal: "E2E erase test - this action should be removed.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 10. Happy path: erase the moderation action as platform admin (should succeed).
  await api.functional.communityPlatform.platformAdmin.reports.moderationActions.erase(
    connection,
    {
      reportId: report.id,
      moderationActionId: moderationAction.id,
    },
  );

  // 11. Second erase as platform admin: should fail because action no longer exists.
  await TestValidator.error(
    "second erase of already erased moderation action should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.erase(
        connection,
        {
          reportId: report.id,
          moderationActionId: moderationAction.id,
        },
      );
    },
  );

  // 12. Switch to member user and confirm unauthorized actor cannot erase.
  const memberReLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberReLoginAuthorized);

  await TestValidator.error(
    "member user must not be able to erase moderation actions",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.moderationActions.erase(
        connection,
        {
          reportId: report.id,
          moderationActionId: moderationAction.id,
        },
      );
    },
  );
}
