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
 * Validate updating a moderation action for a report within a community
 * context.
 *
 * Business flow covered:
 *
 * 1. Platform admin joins (to be able to call platformAdmin-only APIs).
 * 2. Member user joins (to own communities and reports).
 * 3. Platform admin creates a visibility level that communities can reference.
 * 4. Member user creates a community using the visibility level code.
 * 5. Member user subscribes to that community.
 * 6. Member user creates a report, optionally scoped to the community.
 * 7. Platform admin creates a moderation action for the report, scoped to the
 *    community.
 * 8. Platform admin updates the moderation action's mutable fields via PUT.
 * 9. Verify that mutable fields changed, immutable/linkage fields stayed stable,
 *    and timestamps reflect the update.
 */
export async function test_api_moderation_action_update_for_report_in_community_context(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Platform admin creates a visibility level
  // Ensure we are authenticated as platformAdmin (login using its email)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "created visibility level has requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. Member user creates a community with that visibility level
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://app.example.com/login",
    referrer: "https://app.example.com",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
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
    "subscription is linked to community",
    subscription.community_id,
    community.id,
  );

  // 6. Member user creates a report scoped to the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  TestValidator.equals(
    "report retains community context via context_community when available or remains consistent",
    report.context_community?.id ?? community.id,
    community.id,
  );

  // 7. Platform admin creates a moderation action scoped to this community
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const createActionBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Initial warning for reported behavior",
    notes_internal: "First action created during test flow.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: createActionBody,
      },
    );
  typia.assert(createdAction);

  TestValidator.equals(
    "created moderation action linked to report",
    createdAction.community_platform_report_id,
    report.id,
  );
  TestValidator.equals(
    "created moderation action community_id is bound to the community",
    createdAction.community_id,
    community.id,
  );

  const originalActionId = createdAction.id;
  const originalReportId = createdAction.community_platform_report_id;
  const originalCommunityId = createdAction.community_id;
  const originalActorId = createdAction.actor?.id;
  const createdAt = createdAction.created_at;

  // 8. Platform admin updates the moderation action
  const updateBody = {
    action_type: "restrict_user",
    target_scope: "user",
    reason_summary: "Escalated due to repeated violations.",
    notes_internal: "Updated to restriction after additional evidence.",
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updatedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.update(
      connection,
      {
        reportId: report.id,
        moderationActionId: createdAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  // 9. Assert stable linkage fields and updated mutable fields
  TestValidator.equals(
    "moderation action id remains unchanged after update",
    updatedAction.id,
    originalActionId,
  );
  TestValidator.equals(
    "report linkage remains unchanged after moderation action update",
    updatedAction.community_platform_report_id,
    originalReportId,
  );
  TestValidator.equals(
    "community_id remains bound to the original community",
    updatedAction.community_id,
    originalCommunityId,
  );

  TestValidator.equals(
    "action_type is updated to new value",
    updatedAction.action_type,
    updateBody.action_type,
  );
  TestValidator.equals(
    "target_scope is updated to new value",
    updatedAction.target_scope,
    updateBody.target_scope,
  );
  TestValidator.equals(
    "reason_summary reflects updated text",
    updatedAction.reason_summary,
    updateBody.reason_summary,
  );
  TestValidator.equals(
    "notes_internal reflects updated text",
    updatedAction.notes_internal,
    updateBody.notes_internal,
  );

  // 10. Validate timestamps and actor consistency
  TestValidator.predicate(
    "updated_at is equal or later than created_at after update",
    new Date(updatedAction.updated_at).getTime() >=
      new Date(createdAt).getTime(),
  );

  if (originalActorId !== undefined) {
    TestValidator.equals(
      "actor id remains stable after moderation action update",
      updatedAction.actor?.id,
      originalActorId,
    );
  }
}
