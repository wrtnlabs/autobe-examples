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

export async function test_api_moderation_action_update_by_platform_admin_global_scope(
  connection: api.IConnection,
) {
  // 1. Register & authenticate a platform admin who will own visibility-level creation and moderation actions
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a visibility level that will be referenced by the memberUser community
  const visibilityCode = `public_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public - Test",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register & authenticate a member user who will create a community and a report
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorized);

  // 4. As member user, create a community using the visibility level code created by the platform admin
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: "Global Moderation Test Community",
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

  // 5. As member user, create a report scoped to that community.
  // We do not have a concrete reason category creation/listing API here, so use a random UUID
  // trusting backend fixtures or relaxed validation in tests.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(report);

  // 6. Switch back to platform admin explicitly via login to ensure we are in platformAdmin actor context
  const platformAdminLoginBody = {
    identifier: platformAdmin.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAfterLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAfterLogin);

  // 7. As platform admin, create a moderation action for the report.
  // The create endpoint as provided does not explicitly carry the report id,
  // but the ICommunityPlatformModerationAction entity has community_platform_report_id,
  // so we rely on backend-side association rules to bind this action to the
  // previously created report (e.g., latest open report in the community).
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Initial warning due to policy violation from test report",
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // Basic consistency checks on the newly created moderation action focused on business relations
  TestValidator.equals(
    "moderation action's community id should match created community when present",
    moderationAction.community_id ?? community.id,
    community.id,
  );
  TestValidator.equals(
    "moderation action's initial action_type is warn_user",
    moderationAction.action_type,
    moderationActionCreateBody.action_type,
  );
  TestValidator.equals(
    "moderation action's initial target_scope is user",
    moderationAction.target_scope,
    moderationActionCreateBody.target_scope,
  );

  const originalUpdatedAt = moderationAction.updated_at;

  // 8. As platform admin, update mutable fields on the moderation action via PUT endpoint.
  const updatedReasonSummary =
    "Escalated warning after further review of the report context";
  const updatedNotesInternal = RandomGenerator.paragraph({
    sentences: 7,
    wordMin: 4,
    wordMax: 9,
  });

  const moderationActionUpdateBody = {
    reason_summary: updatedReasonSummary,
    notes_internal: updatedNotesInternal,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updatedModerationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.update(
      connection,
      {
        moderationActionId: moderationAction.id,
        body: moderationActionUpdateBody,
      },
    );
  typia.assert(updatedModerationAction);

  // 9. Validate that identifiers and immutable relationships remain unchanged
  TestValidator.equals(
    "updated moderation action id remains the same",
    updatedModerationAction.id,
    moderationAction.id,
  );
  TestValidator.equals(
    "updated moderation action still references the same report",
    updatedModerationAction.community_platform_report_id,
    moderationAction.community_platform_report_id,
  );

  // action_type and target_scope were not part of the update body, so they must remain unchanged
  TestValidator.equals(
    "updated moderation action keeps original action_type when not changed",
    updatedModerationAction.action_type,
    moderationAction.action_type,
  );
  TestValidator.equals(
    "updated moderation action keeps original target_scope when not changed",
    updatedModerationAction.target_scope,
    moderationAction.target_scope,
  );

  // 10. Validate that mutable fields have actually been updated
  TestValidator.equals(
    "reason_summary field should be updated to new value",
    updatedModerationAction.reason_summary,
    updatedReasonSummary,
  );
  TestValidator.equals(
    "notes_internal field should be updated to new value",
    updatedModerationAction.notes_internal,
    updatedNotesInternal,
  );

  // 11. Confirm that updated_at has advanced after update
  TestValidator.predicate(
    "updated_at should change after update",
    () => updatedModerationAction.updated_at !== originalUpdatedAt,
  );
}
