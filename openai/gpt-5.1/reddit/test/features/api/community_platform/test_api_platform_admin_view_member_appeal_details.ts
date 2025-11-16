import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

/**
 * Validate that a platform administrator can view full details of a member
 * user's appeal for a specific report.
 *
 * Business flow:
 *
 * 1. A member user self-registers (join) and becomes authenticated.
 * 2. That member creates a moderation report via the memberUser report endpoint.
 * 3. The same member files an appeal for that report.
 * 4. A platform administrator account is registered (join) and authenticated.
 * 5. The platform admin calls the platformAdmin report-appeal detail endpoint to
 *    fetch the appeal.
 *
 * This test verifies:
 *
 * - Happy path retrieval of a single appeal for a given report by a platformAdmin
 *   actor.
 * - The appeal id and its parent report id match those produced earlier in the
 *   flow.
 * - Core appeal payload fields (appeal_scope, reason_summary, details) round-trip
 *   correctly from create to read.
 * - The embedded report summary in the appeal is consistent with the original
 *   report’s id.
 */
export async function test_api_platform_admin_view_member_appeal_details(
  connection: api.IConnection,
) {
  // 1. Register a member user and authenticate
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Member creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert(createdReport);

  // 3. Member creates an appeal for the report
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: createdReport.id,
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  // 4. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 5. Platform admin fetches the appeal detail
  const fetchedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.platformAdmin.reports.appeals.at(
      connection,
      {
        reportId: createdReport.id,
        appealId: createdAppeal.id,
      },
    );
  typia.assert(fetchedAppeal);

  // Business validations
  TestValidator.equals(
    "appeal id should match created appeal id",
    fetchedAppeal.id,
    createdAppeal.id,
  );

  TestValidator.equals(
    "appeal's report id should match created report id",
    fetchedAppeal.report.id,
    createdReport.id,
  );

  TestValidator.equals(
    "appeal scope should round-trip correctly",
    fetchedAppeal.appeal_scope,
    appealCreateBody.appeal_scope,
  );

  TestValidator.equals(
    "reason summary should round-trip correctly",
    fetchedAppeal.reason_summary,
    appealCreateBody.reason_summary,
  );

  TestValidator.equals(
    "details should round-trip correctly",
    fetchedAppeal.details,
    appealCreateBody.details,
  );
}
