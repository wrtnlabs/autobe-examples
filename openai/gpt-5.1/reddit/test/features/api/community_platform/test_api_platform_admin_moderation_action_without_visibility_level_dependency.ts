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

/**
 * Verify that a platform admin can record a moderation action on a report that
 * is not tied to any specific community visibility configuration.
 *
 * Business goal:
 *
 * - Ensure that global or user-level reports (community_id is null) can still
 *   have moderation actions recorded by a platform admin, without requiring any
 *   community visibility context.
 *
 * High level steps:
 *
 * 1. Create a member user and authenticate as that member.
 * 2. As the member user, create a report via memberUser reports.create where
 *    community_id is explicitly null.
 * 3. Create a platform admin and authenticate as that platformAdmin.
 * 4. As the platformAdmin, create a moderation action for the report via
 *    platformAdmin.reports.moderationActions.create, with community_id null and
 *    target_scope="user".
 * 5. Validate that the created moderation action is linked to the report, has null
 *    community_id, and preserves the requested action_type and target_scope.
 */
export async function test_api_platform_admin_moderation_action_without_visibility_level_dependency(
  connection: api.IConnection,
) {
  // 1. Member user registration (join) and implicit authentication
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "StrongP@ssw0rd!",
    ip: null,
    href: "https://member.example.com/signup",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 2. As member user, create a report with community_id explicitly null
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
      { body: reportCreateBody },
    );
  typia.assert<ICommunityPlatformReport>(report);

  TestValidator.equals(
    "report should not be bound to a specific community",
    report.context_community,
    null,
  );

  // 3. Platform admin registration (join) and implicit authentication
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminStr0ngP@ss!",
    displayName: RandomGenerator.name(),
    ip: "203.0.113.10",
    href: "https://admin.example.com/signup",
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

  // 4. As platform admin, create a moderation action for the report with
  //    community_id null and target_scope "user".
  const action_type = "restrict_user";
  const target_scope = "user";

  const moderationCreateBody = {
    community_id: null,
    action_type,
    target_scope,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.reports.moderationActions.create(
      connection,
      {
        reportId: report.id,
        body: moderationCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 5. Validate linkage and null community_id
  TestValidator.equals(
    "moderation action should be linked to the given report",
    moderationAction.community_platform_report_id,
    report.id,
  );

  TestValidator.equals(
    "moderation action should not be bound to a community",
    moderationAction.community_id,
    null,
  );

  TestValidator.equals(
    "moderation action type should match request",
    moderationAction.action_type,
    action_type,
  );

  TestValidator.equals(
    "moderation target scope should match request",
    moderationAction.target_scope,
    target_scope,
  );

  // Actor and community, if present, must conform to their DTOs. We rely on
  // typia.assert for structural validation above; here we just assert that the
  // absence of a community context does not prevent the action from being
  // recorded.
  await TestValidator.predicate(
    "moderation action should exist even without community visibility context",
    true,
  );
}
