import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that platform admin moderation action update endpoint rejects
 * unauthenticated calls while allowing authenticated ones.
 *
 * Business context: Platform administrators can create moderation actions in
 * response to reports and later update those actions. However, these update
 * operations must be protected so that only authenticated platform admins can
 * perform them. This test ensures that if a client attempts to update an
 * existing moderation action without a valid platform admin auth context, the
 * update request fails while the previously created moderation action remains
 * in a valid state.
 *
 * High-level steps implemented in this test:
 *
 * 1. Register a platform admin via /auth/platformAdmin/join and obtain an
 *    authenticated admin context.
 * 2. As that platform admin, create a new community visibility level which will
 *    later be used by a community.
 * 3. Register a member user via /auth/memberUser/join and obtain an authenticated
 *    member context.
 * 4. As the member user, create a community using the previously created
 *    visibility level (by its code) so we have a community context.
 * 5. As the member user, create a report (pointing to the community) via
 *    /communityPlatform/memberUser/reports.
 * 6. Switch back to platform admin (join already authenticated the admin) and
 *    create a moderation action for that report via
 *    /communityPlatform/platformAdmin/moderationActions.
 * 7. Build a fresh unauthenticated connection by cloning the incoming connection
 *    and assigning an empty headers object, ensuring there is no Authorization
 *    header present.
 * 8. Using this unauthenticated connection, attempt to update the existing
 *    moderation action via PUT
 *    /communityPlatform/platformAdmin/moderationActions/{moderationActionId}
 *    with some update payload (e.g., new action_type and reason_summary). This
 *    call must fail due to missing authentication. We assert that an error is
 *    thrown using TestValidator.error.
 * 9. Finally, call the same update endpoint again using the original (still
 *    authenticated) connection with a small no-op-style update to verify that
 *    authenticated access continues to work after the failed unauthenticated
 *    attempt.
 *
 * Note: Because we do not have a GET endpoint for moderation actions in the
 * provided API surface, we cannot re-load the moderation action to assert that
 * its field values remain unchanged after the failed unauthenticated update.
 * Instead, this test focuses on verifying that the unauthenticated update
 * attempt fails and that authenticated updates are still allowed.
 */
export async function test_api_moderation_action_update_rejects_unauthenticated_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (this also authenticates the admin).
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. As platform admin, create a community visibility level for later use.
  const visibilityCode = `code_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility Level",
    description: "Visibility level for moderation update e2e test.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Register a member user and authenticate as that member.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `member_${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "MemberPassword!123",
    ip: undefined,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As member user, create a community using the created visibility level.
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: "Moderation Action Update Test Community",
    description:
      "Community used to test unauthenticated moderation action update.",
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 5. As member user, create a report in the created community.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformReport.ICreate;
  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 6. Switch back to platform admin context and create a moderation action.
  //    Since join already set the admin token into connection, we are still
  //    authenticated as the platform admin.
  const moderationCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "community",
    reason_summary: "Initial warning based on member report.",
    notes_internal: "Created for unauthenticated update rejection test.",
  } satisfies ICommunityPlatformModerationAction.ICreate;
  const moderationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      { body: moderationCreateBody },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 7. Prepare an unauthenticated connection (no Authorization header).
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Attempt to update the moderation action without authentication.
  const unauthUpdateBody = {
    action_type: "ban_user",
    reason_summary: "Unauthenticated attempt to escalate action should fail.",
    target_scope: "community",
    notes_internal: "This update should not be accepted without auth.",
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  await TestValidator.error(
    "unauthenticated platform admin moderation action update must fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationActions.update(
        unauthConn,
        {
          moderationActionId: moderationAction.id,
          body: unauthUpdateBody,
        },
      );
    },
  );

  // 9. Verify that an authenticated admin can still perform an update
  //    afterwards (we send a minimal update here).
  const authenticatedUpdateBody = {
    notes_internal:
      "Authenticated update after unauthenticated failure (sanity check).",
  } satisfies ICommunityPlatformModerationAction.IUpdate;
  const updatedModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: authenticatedUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(updatedModerationAction);
}
