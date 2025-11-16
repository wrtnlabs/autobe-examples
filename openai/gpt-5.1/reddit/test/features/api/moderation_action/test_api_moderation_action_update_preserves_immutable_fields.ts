import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that updating a moderation action only changes mutable fields.
 *
 * Business flow:
 *
 * 1. Platform admin joins and creates a visibility level.
 * 2. Member user joins and creates a community using that visibility code.
 * 3. Member user creates a report that will be referenced by moderation actions.
 * 4. Community moderator joins and creates an initial moderation action.
 * 5. First update mutates only reason_summary and notes_internal and we assert
 *    immutable fields stay the same while updated_at advances.
 * 6. Second update again only touches descriptive fields and we re-assert
 *    invariants across multiple updates.
 */
export async function test_api_moderation_action_update_preserves_immutable_fields(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: "Visibility level for E2E moderation action tests",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility code should match",
    visibility.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates a community using the visibility level code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphabets(8)}`,
    title: "Moderation Action Test Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Member user creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
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

  // 6. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. Create initial moderation action as community moderator
  const initialActionType = "remove_content";
  const initialTargetScope = "post";

  const moderationCreateBody = {
    community_id: community.id,
    action_type: initialActionType,
    target_scope: initialTargetScope,
    reason_summary: "Initial decision: remove violating content.",
    notes_internal: "First pass moderation review.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationCreateBody },
    );
  typia.assert(createdAction);

  // Capture immutable fields snapshot
  const immutableId = createdAction.id;
  const immutableReportId = createdAction.community_platform_report_id;
  const immutableCommunityModeratorId =
    createdAction.communitymoderator_id ?? null;
  const immutablePlatformAdminId = createdAction.platformadmin_id ?? null;
  const immutableCommunityId = createdAction.community_id ?? null;
  const immutableActionType = createdAction.action_type;
  const immutableTargetScope = createdAction.target_scope;
  const immutableCreatedAt = createdAction.created_at;
  const immutableActor = createdAction.actor;
  const immutableCommunitySummary = createdAction.community ?? null;
  const firstUpdatedAt = createdAction.updated_at;

  // 8. First update: change only reason_summary and notes_internal
  const firstUpdateBody = {
    reason_summary: "Updated summary after deeper review.",
    notes_internal: "Additional context added by moderator in first update.",
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const firstUpdatedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.update(
      connection,
      {
        moderationActionId: immutableId,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstUpdatedAction);

  // Assert immutable fields unchanged after first update
  TestValidator.equals(
    "id should remain unchanged after first update",
    firstUpdatedAction.id,
    immutableId,
  );
  TestValidator.equals(
    "report link should remain unchanged after first update",
    firstUpdatedAction.community_platform_report_id,
    immutableReportId,
  );
  TestValidator.equals(
    "community moderator id should remain unchanged after first update",
    firstUpdatedAction.communitymoderator_id ?? null,
    immutableCommunityModeratorId,
  );
  TestValidator.equals(
    "platform admin id should remain unchanged after first update",
    firstUpdatedAction.platformadmin_id ?? null,
    immutablePlatformAdminId,
  );
  TestValidator.equals(
    "community id should remain unchanged after first update",
    firstUpdatedAction.community_id ?? null,
    immutableCommunityId,
  );
  TestValidator.equals(
    "action_type should remain unchanged after first update",
    firstUpdatedAction.action_type,
    immutableActionType,
  );
  TestValidator.equals(
    "target_scope should remain unchanged after first update",
    firstUpdatedAction.target_scope,
    immutableTargetScope,
  );
  TestValidator.equals(
    "created_at should remain unchanged after first update",
    firstUpdatedAction.created_at,
    immutableCreatedAt,
  );
  TestValidator.equals(
    "actor summary should remain unchanged after first update",
    firstUpdatedAction.actor ?? null,
    immutableActor ?? null,
  );
  TestValidator.equals(
    "community summary should remain unchanged after first update",
    firstUpdatedAction.community ?? null,
    immutableCommunitySummary,
  );

  TestValidator.notEquals(
    "updated_at should change after first update",
    firstUpdatedAction.updated_at,
    firstUpdatedAt,
  );

  TestValidator.equals(
    "reason_summary should be updated in first update",
    firstUpdatedAction.reason_summary ?? null,
    firstUpdateBody.reason_summary ?? null,
  );
  TestValidator.equals(
    "notes_internal should be updated in first update",
    firstUpdatedAction.notes_internal ?? null,
    firstUpdateBody.notes_internal ?? null,
  );

  // 9. Second update: new descriptive values, still only mutable fields
  const secondUpdateBody = {
    reason_summary: "Final decision with clarified policy mapping.",
    notes_internal:
      "Second update: notes refined to align with enforcement guidelines.",
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const secondUpdatedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.update(
      connection,
      {
        moderationActionId: immutableId,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondUpdatedAction);

  // Re-assert immutable fields remain fixed after second update
  TestValidator.equals(
    "id should remain unchanged after second update",
    secondUpdatedAction.id,
    immutableId,
  );
  TestValidator.equals(
    "report link should remain unchanged after second update",
    secondUpdatedAction.community_platform_report_id,
    immutableReportId,
  );
  TestValidator.equals(
    "community moderator id should remain unchanged after second update",
    secondUpdatedAction.communitymoderator_id ?? null,
    immutableCommunityModeratorId,
  );
  TestValidator.equals(
    "platform admin id should remain unchanged after second update",
    secondUpdatedAction.platformadmin_id ?? null,
    immutablePlatformAdminId,
  );
  TestValidator.equals(
    "community id should remain unchanged after second update",
    secondUpdatedAction.community_id ?? null,
    immutableCommunityId,
  );
  TestValidator.equals(
    "action_type should remain unchanged after second update",
    secondUpdatedAction.action_type,
    immutableActionType,
  );
  TestValidator.equals(
    "target_scope should remain unchanged after second update",
    secondUpdatedAction.target_scope,
    immutableTargetScope,
  );
  TestValidator.equals(
    "created_at should remain unchanged after second update",
    secondUpdatedAction.created_at,
    immutableCreatedAt,
  );
  TestValidator.equals(
    "actor summary should remain unchanged after second update",
    secondUpdatedAction.actor ?? null,
    immutableActor ?? null,
  );
  TestValidator.equals(
    "community summary should remain unchanged after second update",
    secondUpdatedAction.community ?? null,
    immutableCommunitySummary,
  );

  TestValidator.notEquals(
    "updated_at should change again after second update",
    secondUpdatedAction.updated_at,
    firstUpdatedAction.updated_at,
  );

  TestValidator.equals(
    "reason_summary should reflect second update",
    secondUpdatedAction.reason_summary ?? null,
    secondUpdateBody.reason_summary ?? null,
  );
  TestValidator.equals(
    "notes_internal should reflect second update",
    secondUpdatedAction.notes_internal ?? null,
    secondUpdateBody.notes_internal ?? null,
  );
}
