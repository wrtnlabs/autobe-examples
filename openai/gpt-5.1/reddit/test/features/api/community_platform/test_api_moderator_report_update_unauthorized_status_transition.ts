import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that community moderator report update rejects unauthorized or
 * invalid status transitions.
 *
 * Business context:
 *
 * - Platform admins define standardized report reason categories.
 * - Member users can create moderation reports with those categories.
 * - Community moderators are allowed to transition reports through a controlled
 *   workflow.
 * - The system must prevent moderators from performing invalid state transitions
 *   (e.g., skipping required intermediate states or using unsupported status
 *   codes).
 *
 * Scenario:
 *
 * 1. Register and login a platform admin.
 * 2. Using platform admin privileges, create a new report reason category.
 * 3. Register and login a member user.
 * 4. As the member user, create a new report using the created reason category.
 * 5. Register and login a community moderator (the SDK join call already
 *    authenticates and sets Authorization header).
 * 6. Capture the original report state as seen by platform admin via GET
 *    /communityPlatform/platformAdmin/reports/{reportId}.
 * 7. As the community moderator, attempt an invalid status transition via PUT
 *    /communityPlatform/communityModerator/reports/{reportId} using
 *    ICommunityPlatformReport.IUpdate.
 *
 *    - Pick a clearly different, terminal-sounding status string compared to the
 *         original status.
 *    - This should simulate an attempt to jump directly into a resolution state.
 *    - The request body must be correctly typed and must not rely on any type
 *         errors.
 * 8. Use TestValidator.error to assert that the update call fails (no direct HTTP
 *    status inspection).
 * 9. Switch back to platform admin context and re-fetch the report.
 * 10. Assert that the report’s key lifecycle fields have not changed:
 *
 *     - Status must equal the pre-update status.
 *     - Severity must equal the pre-update severity.
 *     - Resolved_at must equal the pre-update resolved_at.
 */
export async function test_api_moderator_report_update_unauthorized_status_transition(
  connection: api.IConnection,
) {
  // 1. Register and login a platform admin (join already authenticates and sets token header).
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a report reason category as platform admin.
  const reasonCategoryCreateBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_user_visible: true,
    is_active: true,
  } satisfies ICommunityPlatformReportReasonCategory.ICreate;

  const reasonCategory: ICommunityPlatformReportReasonCategory =
    await api.functional.communityPlatform.platformAdmin.reportReasonCategories.create(
      connection,
      {
        body: reasonCategoryCreateBody,
      },
    );
  typia.assert(reasonCategory);

  // 3. Register and login a member user.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberP@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/signup",
    referrer: "https://app.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As the member user, create a new report using the created reason category.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: reasonCategory.id,
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(createdReport);

  // 5. Register and login a community moderator. join already authenticates, so explicit login is not required for initial token.
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@mod.example.com` as string &
      tags.Format<"email">,
    password: "ModeratorP@ssw0rd!",
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. Capture the original report state as seen by platform admin.
  // Switch back to platform admin context by logging in.
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/dashboard",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  const originalReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(originalReport);

  const originalStatus: string = originalReport.status;
  const originalSeverity: string | null | undefined = originalReport.severity;
  const originalResolvedAt: string | null | undefined =
    originalReport.resolved_at;

  // 7. As the community moderator, attempt an invalid status transition.
  // Re-authenticate as community moderator to ensure Authorization header is set for this actor.
  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/dashboard",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  const invalidStatus = "resolved_user_action";

  const invalidUpdateBody = {
    status: invalidStatus,
    severity: null,
    report_reason_category_id: originalReport.reason_category
      ? originalReport.reason_category.id
      : null,
    community_id: originalReport.context_community
      ? originalReport.context_community.id
      : null,
    description: originalReport.description ?? null,
  } satisfies ICommunityPlatformReport.IUpdate;

  await TestValidator.error(
    "community moderator cannot perform invalid status transition on report",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.update(
        connection,
        {
          reportId: createdReport.id,
          body: invalidUpdateBody,
        },
      );
    },
  );

  // 9. Switch back to platform admin context and re-fetch the report.
  const platformAdminLoginAgain: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginAgain);

  const reloadedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.platformAdmin.reports.at(
      connection,
      {
        reportId: createdReport.id,
      },
    );
  typia.assert(reloadedReport);

  // 10. Assert that key lifecycle-related fields have not changed.
  TestValidator.equals(
    "report status must remain unchanged after invalid moderator update",
    reloadedReport.status,
    originalStatus,
  );

  TestValidator.equals(
    "report severity must remain unchanged after invalid moderator update",
    reloadedReport.severity ?? null,
    originalSeverity ?? null,
  );

  TestValidator.equals(
    "report resolved_at must remain unchanged after invalid moderator update",
    reloadedReport.resolved_at ?? null,
    originalResolvedAt ?? null,
  );
}
