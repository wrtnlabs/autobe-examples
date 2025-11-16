import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_platform_admin_moderation_action_audit_fields(
  connection: api.IConnection,
) {
  // 1. Register a member user who will file the report
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberUser!123",
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As member user, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Register a platform admin who will perform the moderation action
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "PlatformAdmin!123",
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://community.example.com/admin/join",
    referrer: "https://community.example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 4. Create a moderation action for the report as platformAdmin
  const moderationActionCreateBody = {
    community_id: null,
    action_type: "label_content",
    target_scope: "post",
    reason_summary: "Label content for policy review",
    notes_internal: null,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const action: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationActionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(action);

  // 5. Validate audit related fields

  // 5-1. Report linkage
  TestValidator.equals(
    "moderation action should reference the parent report id",
    action.community_platform_report_id,
    report.id,
  );

  // 5-2. Actor linkage: platform admin vs community moderator
  TestValidator.predicate(
    "platformadmin_id should be populated on platform-admin-created action",
    action.platformadmin_id !== null && action.platformadmin_id !== undefined,
  );

  TestValidator.equals(
    "communitymoderator_id should be null when action is taken by platform admin",
    action.communitymoderator_id,
    null,
  );

  // 5-3. Actor summary
  TestValidator.predicate(
    "actor summary should be present on moderation action",
    action.actor !== undefined && action.actor !== null,
  );

  if (action.actor !== undefined && action.actor !== null) {
    const actor: ICommunityPlatformActor.ISummary = action.actor;

    TestValidator.equals(
      "actorType should indicate platformadmin",
      actor.actorType,
      "platformadmin",
    );

    if (
      action.platformadmin_id !== null &&
      action.platformadmin_id !== undefined
    ) {
      TestValidator.equals(
        "actor.id should match platformadmin_id on moderation action",
        actor.id,
        action.platformadmin_id,
      );
    }
  }

  // 6. Timestamps
  const createdAtMillis = new Date(action.created_at).getTime();
  const updatedAtMillis = new Date(action.updated_at).getTime();

  TestValidator.predicate(
    "created_at should be a valid timestamp",
    Number.isFinite(createdAtMillis),
  );

  TestValidator.predicate(
    "updated_at should be a valid timestamp",
    Number.isFinite(updatedAtMillis),
  );

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    createdAtMillis <= updatedAtMillis,
  );

  // 7. Sanity checks
  TestValidator.predicate(
    "moderation action id should be non-empty",
    action.id.length > 0,
  );

  TestValidator.equals(
    "action_type should echo the requested value",
    action.action_type,
    moderationActionCreateBody.action_type,
  );

  TestValidator.equals(
    "target_scope should echo the requested value",
    action.target_scope,
    moderationActionCreateBody.target_scope,
  );

  TestValidator.equals(
    "reason_summary should echo the requested value",
    action.reason_summary,
    moderationActionCreateBody.reason_summary,
  );

  TestValidator.equals(
    "notes_internal should echo the requested value (null)",
    action.notes_internal,
    moderationActionCreateBody.notes_internal,
  );
}
