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

export async function test_api_moderation_action_update_concurrent_edits_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a community visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As the member user, create a community using the created visibility level
  const communityCreateBody = {
    identifier: `test-community-${RandomGenerator.alphabets(8)}`,
    title: "Concurrent Moderation Action Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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

  // 5. As the member user, create a report that references the community
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
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

  // 6. Switch to platform admin (login) and create an initial moderation action
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  const moderationCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: "Initial moderation decision for reported behavior",
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const initialAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      { body: moderationCreateBody },
    );
  typia.assert(initialAction);

  const initialUpdatedAt: string & tags.Format<"date-time"> =
    initialAction.updated_at;
  const initialCreatedAt: string & tags.Format<"date-time"> =
    initialAction.created_at;

  // Snapshot immutable and baseline fields
  const baselineId = initialAction.id;
  const baselineReportId = initialAction.community_platform_report_id;
  const baselineActionType = initialAction.action_type;
  const baselineTargetScope = initialAction.target_scope;
  const baselineNotesInternal = initialAction.notes_internal ?? null;

  // 7 & 8. Prepare concurrent update payloads (View A and View B)
  const reasonSummaryA = "View A summary - first concurrent update";
  const notesInternalA = "Internal notes from View A update";
  const reasonSummaryB = "View B summary - second concurrent update";

  const updateBodyA = {
    reason_summary: reasonSummaryA,
    notes_internal: notesInternalA,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updateBodyB = {
    reason_summary: reasonSummaryB,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  // 9. First update from View A
  const afterA: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.update(
      connection,
      {
        moderationActionId: initialAction.id,
        body: updateBodyA,
      },
    );
  typia.assert(afterA);

  TestValidator.equals(
    "id should remain stable after first update",
    afterA.id,
    baselineId,
  );
  TestValidator.equals(
    "report id should remain stable after first update",
    afterA.community_platform_report_id,
    baselineReportId,
  );
  TestValidator.equals(
    "reason_summary should be updated to View A value",
    afterA.reason_summary,
    reasonSummaryA,
  );
  TestValidator.equals(
    "notes_internal should be updated to View A value",
    afterA.notes_internal,
    notesInternalA,
  );
  TestValidator.notEquals(
    "updated_at should change after first update",
    afterA.updated_at,
    initialUpdatedAt,
  );

  const afterAUpdatedAt: string & tags.Format<"date-time"> = afterA.updated_at;

  // 10. Second update from View B using stale snapshot
  const afterB: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.update(
      connection,
      {
        moderationActionId: initialAction.id,
        body: updateBodyB,
      },
    );
  typia.assert(afterB);

  // 11. Verify last-write-wins semantics for explicitly provided fields
  TestValidator.equals(
    "id should remain stable after second update",
    afterB.id,
    baselineId,
  );
  TestValidator.equals(
    "report id should remain stable after second update",
    afterB.community_platform_report_id,
    baselineReportId,
  );
  TestValidator.equals(
    "reason_summary should now reflect View B value (last write wins)",
    afterB.reason_summary,
    reasonSummaryB,
  );

  // notes_internal should remain from View A because View B body omitted it
  TestValidator.equals(
    "notes_internal should remain from View A when omitted in second update",
    afterB.notes_internal,
    notesInternalA,
  );

  TestValidator.notEquals(
    "updated_at should change again after second update",
    afterB.updated_at,
    afterAUpdatedAt,
  );

  // 12. Verify immutable / untouched fields remain stable across updates
  TestValidator.equals(
    "created_at should remain unchanged across updates",
    afterB.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "action_type should remain unchanged across updates",
    afterB.action_type,
    baselineActionType,
  );
  TestValidator.equals(
    "target_scope should remain unchanged across updates",
    afterB.target_scope,
    baselineTargetScope,
  );

  // For completeness, ensure initial notes_internal baseline does not conflict
  if (baselineNotesInternal !== null) {
    TestValidator.predicate(
      "baseline notes_internal should either match initial or be overwritten by View A",
      baselineNotesInternal === initialAction.notes_internal ||
        notesInternalA === afterB.notes_internal,
    );
  }
}
