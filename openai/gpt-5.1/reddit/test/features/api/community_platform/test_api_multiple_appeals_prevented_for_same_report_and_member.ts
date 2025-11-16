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
 * Verify that a member user cannot file multiple appeals for the same report.
 *
 * Business rule: for a given combination of (report, appellant member user),
 * only a single open appeal should be allowed at a time. Any subsequent
 * attempts by the same member to appeal the same report while an appeal is
 * already present must be rejected by the backend.
 *
 * End-to-end flow exercised by this test:
 *
 * 1. Register a new member user via POST /auth/memberUser/join; this also
 *    authenticates the connection for the memberUser actor.
 * 2. As this authenticated member, create a moderation report via POST
 *    /communityPlatform/memberUser/reports using
 *    ICommunityPlatformReport.ICreate.
 * 3. Submit the first appeal for that report via POST
 *    /communityPlatform/memberUser/reports/{reportId}/appeals using a valid
 *    ICommunityPlatformAppeal.ICreate payload. Assert success and validate the
 *    response type.
 * 4. Attempt to submit a second appeal for the same report with the same member
 *    and a different but still valid ICommunityPlatformAppeal.ICreate body.
 *    This call must fail; assert that an error is thrown using
 *    TestValidator.error without inspecting HTTP status codes.
 * 5. Because no appeal listing/detail endpoint is provided in the SDK, skip
 *    querying appeals and instead rely solely on the success of the first
 *    creation and failure of the second attempt to confirm enforcement of the
 *    single-open-appeal constraint.
 */
export async function test_api_multiple_appeals_prevented_for_same_report_and_member(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a moderation report as this member user
  const reportBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Create the first appeal for this report
  const firstAppealBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const firstAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: firstAppealBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(firstAppeal);

  // 4. Second appeal should be rejected
  const secondAppealBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    details: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  await TestValidator.error(
    "second appeal for same report and member should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.appeals.create(
        connection,
        {
          reportId: report.id,
          body: secondAppealBody,
        },
      );
    },
  );
}
