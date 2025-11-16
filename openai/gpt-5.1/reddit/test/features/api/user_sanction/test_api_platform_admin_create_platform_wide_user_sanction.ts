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
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can create a platform-wide user
 * sanction.
 *
 * Business context:
 *
 * - Platform admins may apply sanctions that are not scoped to a single community
 *   but instead affect a member user across the entire platform.
 * - Such sanctions are created with community_id = null while still referencing a
 *   motivating report and target member user.
 *
 * End-to-end flow:
 *
 * 1. Create a memberUser via /auth/memberUser/join and keep their id for
 *    sanctioning.
 * 2. Authenticate as that memberUser (optional for this scenario, but we mimic a
 *    realistic flow where a report is created in memberUser context).
 * 3. Create a report with /communityPlatform/memberUser/reports using
 *    ICommunityPlatformReport.ICreate, with community_id explicitly set to null
 *    to represent a platform-wide context.
 * 4. Create a platformAdmin via /auth/platformAdmin/join and authenticate as that
 *    admin (join already returns an authorized context and sets Authorization
 *    header).
 * 5. As platformAdmin, call /communityPlatform/platformAdmin/userSanctions with
 *    ICommunityPlatformUserSanction.ICreate where:
 *
 *    - Community_platform_report_id = report.id
 *    - Sanctioned_memberuser_id = memberUser.id
 *    - Community_id = null (platform-wide sanction)
 *    - Sanction_type = a platform-level string such as "permanent_platform_ban"
 *    - Status = "active"
 *    - Effective_from = now
 *    - Effective_until = null (permanent)
 *    - Reason_summary / notes_internal are filled with random text.
 * 6. Assert that the response is a valid ICommunityPlatformUserSanction and that:
 *
 *    - Sanction.community is null (no community scope)
 *    - Sanction.report.id equals the created report id
 *    - Sanction.sanctioned_memberUser.id equals the member user id
 *    - Sanction.sanction_type and status reflect the requested values.
 */
export async function test_api_platform_admin_create_platform_wide_user_sanction(
  connection: api.IConnection,
) {
  // 1. Register a member user who will eventually be sanctioned.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const sanctionedMemberId = memberAuthorized.id;

  // 2. Create a platform-wide report as memberUser.
  //    The SDK already has the member user access token set via join.
  const reportCreateBody = {
    reporter_type: "member", // consistent with a logged-in member user
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "high",
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

  const reportId = report.id;

  // 3. Register and authenticate a platform admin.
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // 4. As platformAdmin, create a platform-wide user sanction.
  const now = new Date();
  const sanctionCreateBody = {
    community_platform_report_id: reportId,
    sanctioned_memberuser_id: sanctionedMemberId,
    community_id: null,
    sanction_type: "permanent_platform_ban",
    status: "active",
    effective_from: now.toISOString(),
    effective_until: null,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformUserSanction.ICreate;

  const sanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.platformAdmin.userSanctions.create(
      connection,
      {
        body: sanctionCreateBody,
      },
    );
  typia.assert(sanction);

  // 5. Business-level assertions.
  TestValidator.equals(
    "sanction should be platform-wide (community null)",
    sanction.community,
    null,
  );

  TestValidator.equals(
    "sanction should reference the motivating report",
    sanction.report.id,
    reportId,
  );

  TestValidator.equals(
    "sanction should target the expected member user",
    sanction.sanctioned_memberUser.id,
    sanctionedMemberId,
  );

  TestValidator.equals(
    "sanction_type should match requested platform-level type",
    sanction.sanction_type,
    sanctionCreateBody.sanction_type,
  );

  TestValidator.equals(
    "status should match requested initial status",
    sanction.status,
    sanctionCreateBody.status,
  );
}
