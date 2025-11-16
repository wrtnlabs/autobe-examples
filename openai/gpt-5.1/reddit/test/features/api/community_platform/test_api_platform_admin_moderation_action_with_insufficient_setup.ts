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
 * Validate creation of a moderation action by a platform admin with minimal
 * setup.
 *
 * Business goal (adapted):
 *
 * - Ensure that after a memberUser files a report, a platformAdmin can create a
 *   moderation action under that report using the
 *   /communityPlatform/platformAdmin/reports/{reportId}/moderationActions
 *   endpoint, even when no explicit community/visibility/subscription entities
 *   have been created in this test.
 * - Focus on contract correctness and linkage between report and moderation
 *   action, not on enforcing foreign-key or business-level community validation
 *   (which we cannot observe from this test alone).
 *
 * End-to-end steps:
 *
 * 1. Register a memberUser with /auth/memberUser/join, which also authenticates
 *    them (sets Authorization header via SDK).
 * 2. As that memberUser, create a report with
 *    /communityPlatform/memberUser/reports using
 *    ICommunityPlatformReport.ICreate.
 *
 *    - Use a valid reporter_type string like "member".
 *    - Use a random UUID for report_reason_category_id.
 *    - Leave community_id undefined or null (no explicit community setup).
 *    - Provide optional severity and description for realism.
 * 3. Register a platformAdmin with /auth/platformAdmin/join. This also
 *    authenticates as the platformAdmin via SDK (overwriting Authorization).
 * 4. As platformAdmin, call
 *    /communityPlatform/platformAdmin/reports/{reportId}/moderationActions with
 *    ICommunityPlatformModerationAction.ICreate:
 *
 *    - ReportId is the id from the created report.
 *    - Community_id is set to a random UUID, representing an intended community that
 *         does not exist in this test context.
 *    - Action_type is a reasonable string like "remove_content".
 *    - Target_scope is a reasonable string like "community".
 *    - Provide reason_summary and notes_internal.
 * 5. Validate that the moderationActions.create call succeeds and returns a
 *    well-typed ICommunityPlatformModerationAction:
 *
 *    - Typia.assert on the returned moderation action.
 *    - Ensure moderationAction.community_platform_report_id equals the report.id.
 *    - Ensure moderationAction.action_type and target_scope echo back the values
 *         sent in the body.
 *    - Verify via TestValidator that the ID fields are stable and non-empty.
 */
export async function test_api_platform_admin_moderation_action_with_insufficient_setup(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinBody,
    },
  );
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  TestValidator.predicate(
    "report id should be a non-empty string",
    typeof report.id === "string" && report.id.length > 0,
  );

  // 3. Register and authenticate a platform admin
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinBody,
    },
  );
  typia.assert(platformAdminAuthorized);

  // 4. As platformAdmin, create a moderation action linked to the report
  const fakeCommunityId = typia.random<string & tags.Format<"uuid">>();

  const moderationCreateBody = {
    community_id: fakeCommunityId,
    action_type: "remove_content",
    target_scope: "community",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 5. Validate linkage and echo of core fields
  TestValidator.equals(
    "moderation action should reference the same report id",
    moderationAction.community_platform_report_id,
    report.id,
  );

  TestValidator.equals(
    "moderation action type should echo request body",
    moderationAction.action_type,
    moderationCreateBody.action_type,
  );

  TestValidator.equals(
    "moderation target_scope should echo request body",
    moderationAction.target_scope,
    moderationCreateBody.target_scope,
  );

  TestValidator.predicate(
    "moderation action id should be a non-empty string",
    typeof moderationAction.id === "string" && moderationAction.id.length > 0,
  );
}
