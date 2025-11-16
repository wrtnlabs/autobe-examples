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
 * Validate that a platform administrator can record a moderation action against
 * a member-submitted report with full community context established.
 *
 * Business flow under test:
 *
 * 1. Platform admin joins (and becomes authenticated).
 * 2. Platform admin configures a community visibility level master.
 * 3. Member user joins and authenticates.
 * 4. Member user creates a community bound to that visibility level.
 * 5. Member user subscribes to that community.
 * 6. Member user creates a report scoped to that community.
 * 7. Platform admin re-authenticates (context switch back to platform admin).
 * 8. Platform admin records a moderation action for the report, explicitly tying
 *    it to the community.
 * 9. The test validates that the moderation action response correctly wires
 *    report, community, actor, and textual fields.
 */
export async function test_api_platform_admin_moderation_action_creation_with_full_context(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/auth/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityBody },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUsername = `member_${RandomGenerator.alphabets(10)}`;

  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(14),
    ip: "127.0.0.1",
    href: "https://community.local/auth/join",
    referrer: "https://community.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community with that visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member user subscribes to the community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
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

  TestValidator.equals(
    "subscription community id should match created community",
    subscription.community_id,
    community.id,
  );

  // 6. Member user creates a report scoped to that community
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  TestValidator.equals(
    "report should carry the same community context id when present",
    report.context_community?.id ?? community.id,
    community.id,
  );

  // 7. Switch back to platform admin explicitly via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/auth/login",
    referrer: "https://admin.console.local/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminReAuth: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReAuth);

  // 8. Platform admin creates a moderation action for the report
  const actionType = "remove_content";
  const targetScope = "post";
  const reasonSummaryText = RandomGenerator.paragraph({ sentences: 4 });
  const internalNotesText = RandomGenerator.paragraph({ sentences: 6 });

  const moderationCreateBody = {
    community_id: community.id,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: reasonSummaryText,
    notes_internal: internalNotesText,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 9. Business validations on moderation action response
  TestValidator.equals(
    "moderation action should be linked to original report",
    moderationAction.community_platform_report_id,
    report.id,
  );

  TestValidator.equals(
    "moderation action community id should match community",
    moderationAction.community_id ?? community.id,
    community.id,
  );

  TestValidator.equals(
    "moderation action type should echo request body",
    moderationAction.action_type,
    actionType,
  );

  TestValidator.equals(
    "moderation action target_scope should echo request body",
    moderationAction.target_scope,
    targetScope,
  );

  TestValidator.equals(
    "moderation action reason_summary should echo request body",
    moderationAction.reason_summary,
    reasonSummaryText,
  );

  TestValidator.equals(
    "moderation action notes_internal should echo request body",
    moderationAction.notes_internal,
    internalNotesText,
  );

  TestValidator.predicate(
    "moderation action must have non-empty created_at",
    moderationAction.created_at.length > 0,
  );

  TestValidator.predicate(
    "moderation action must have non-empty updated_at",
    moderationAction.updated_at.length > 0,
  );

  if (moderationAction.actor !== undefined) {
    TestValidator.predicate(
      "moderation action actor displayName should be non-empty when present",
      moderationAction.actor.displayName.length > 0,
    );
  }
}
