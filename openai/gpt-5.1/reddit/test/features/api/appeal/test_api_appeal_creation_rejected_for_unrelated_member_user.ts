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
 * Verify that a member user cannot create an appeal for a report they do not
 * own.
 *
 * Business context:
 *
 * - Reports are created by authenticated member users via the memberUser surface.
 * - Appeals against reports must be submitted only by authorized actors,
 *   typically the affected member (owner of the content/sanction/report
 *   context).
 * - If an unrelated member attempts to appeal a report that does not belong to
 *   them, the backend must reject the request with an authorization/permission
 *   error.
 *
 * Scenario steps:
 *
 * 1. Register Member A using POST /auth/memberUser/join and obtain tokens
 *    (ICommunityPlatformMemberuser.IAuthorized). The SDK will automatically set
 *    connection.headers.Authorization to Member A's access token.
 * 2. While authenticated as Member A, create a report using POST
 *    /communityPlatform/memberUser/reports with an
 *    ICommunityPlatformReport.ICreate request body. Capture the created
 *    ICommunityPlatformReport.id for later use.
 * 3. Register Member B using POST /auth/memberUser/join again. This will switch
 *    the SDK auth context on the same `connection` to Member B by overwriting
 *    connection.headers.Authorization with Member B's token.
 * 4. While authenticated as Member B, attempt to create an appeal for Member A's
 *    report via POST /communityPlatform/memberUser/reports/{reportId}/appeals
 *    using a valid ICommunityPlatformAppeal.ICreate payload. Because Member B
 *    is unrelated to the report, the backend should reject this operation as
 *    unauthorized.
 * 5. Use TestValidator.error with an async closure to assert that the appeal
 *    creation attempt fails. We must not assert specific HTTP status codes,
 *    only that an error is thrown.
 * 6. For all successful operations (Member A join, report creation, Member B
 *    join), validate responses with typia.assert to guarantee DTO contract
 *    adherence.
 */
export async function test_api_appeal_creation_rejected_for_unrelated_member_user(
  connection: api.IConnection,
) {
  // 1. Register Member A (original report owner)
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    // Optional ip left undefined
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Member A creates a report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 3. Register Member B (unrelated member user who will attempt the appeal)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 4. As Member B, attempt to create an appeal for Member A's report
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  await TestValidator.error(
    "unrelated member user cannot create appeal for someone else's report",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.appeals.create(
        connection,
        {
          reportId: report.id,
          body: appealCreateBody,
        },
      );
    },
  );
}
