import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

/**
 * Validate creation of memberUser-originated user reports with and without
 * optional reason_detail.
 *
 * This test ensures that a memberUser can file user-level reports against
 * another member account through POST
 * /communityPlatform/memberUser/userReports, and that the optional
 * reason_detail field behaves correctly when present and when omitted.
 *
 * Business workflow covered:
 *
 * 1. A reporter member user joins via POST /auth/memberUser/join, establishing an
 *    authenticated memberUser session (token is applied automatically by SDK).
 * 2. A separate member user joins to serve as the reported target.
 * 3. Using the reporter’s authenticated context, the test creates a user report
 *    with a non-null, descriptive reason_detail string along with required
 *    fields (reported_memberuser_id, reason_category, status, severity).
 * 4. The response is validated to:
 *
 *    - Conform to ICommunityPlatformUserReport
 *    - Preserve reason_detail exactly as provided
 *    - Set reported_memberuser_id to the target user’s id
 *    - Set reporter_memberuser_id to the reporter’s id
 *    - Populate contextual relations reported_member and reporter_member with the
 *         matching member summaries.
 * 5. The same reporter creates a second user report for the same or another member
 *    where reason_detail is omitted (or explicitly null). The response must:
 *
 *    - Be accepted and conform to ICommunityPlatformUserReport
 *    - Have reason_detail === null (or absent but treated as null)
 *    - Preserve correct reporter_memberuser_id and reported_memberuser_id
 *    - Maintain valid contextual relations for reported_member and reporter_member.
 *
 * This verifies that reason_detail is truly optional, that free-text details
 * are stored and returned faithfully when provided, and that both variants
 * share correct relational wiring and core triage metadata.
 */
export async function test_api_member_user_creates_report_with_optional_reason_detail(
  connection: api.IConnection,
) {
  // 1. Reporter memberUser joins and becomes authenticated
  const reporterJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reporter: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert(reporter);

  // 2. Reported memberUser joins (subject of the report)
  const reportedJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reported: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reportedJoinBody,
    });
  typia.assert(reported);

  // 3. Reporter creates first report with non-null reason_detail
  const detailedReason = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });

  const createBodyWithDetail = {
    reported_memberuser_id: reported.id,
    reason_category: "harassment",
    reason_detail: detailedReason,
    status: "open",
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const reportWithDetail: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      { body: createBodyWithDetail },
    );
  typia.assert(reportWithDetail);

  // Validate IDs and reason_detail echo
  TestValidator.equals(
    "reported_memberuser_id should match target member id in detailed report",
    reportWithDetail.reported_memberuser_id,
    reported.id,
  );
  TestValidator.equals(
    "reporter_memberuser_id should equal reporter id in detailed report",
    reportWithDetail.reporter_memberuser_id,
    reporter.id,
  );
  TestValidator.equals(
    "reason_detail should be preserved exactly for detailed report",
    reportWithDetail.reason_detail,
    detailedReason,
  );

  // Contextual relations
  TestValidator.predicate(
    "reported_member summary should be populated for detailed report",
    reportWithDetail.reported_member !== undefined &&
      reportWithDetail.reported_member !== null &&
      reportWithDetail.reported_member.id ===
        reportWithDetail.reported_memberuser_id,
  );
  TestValidator.predicate(
    "reporter_member summary should be populated for detailed report",
    reportWithDetail.reporter_member !== undefined &&
      reportWithDetail.reporter_member !== null &&
      reportWithDetail.reporter_member.id ===
        reportWithDetail.reporter_memberuser_id,
  );

  // 4. Reporter creates second report with reason_detail omitted (treated as null)
  const createBodyWithoutDetail = {
    reported_memberuser_id: reported.id,
    reason_category: "spam",
    status: "open",
    severity: "low",
  } satisfies ICommunityPlatformUserReport.ICreate;

  const reportWithoutDetail: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      { body: createBodyWithoutDetail },
    );
  typia.assert(reportWithoutDetail);

  TestValidator.equals(
    "reported_memberuser_id should match target member id when reason_detail omitted",
    reportWithoutDetail.reported_memberuser_id,
    reported.id,
  );
  TestValidator.equals(
    "reporter_memberuser_id should equal reporter id when reason_detail omitted",
    reportWithoutDetail.reporter_memberuser_id,
    reporter.id,
  );

  // reason_detail is optional and should be null or undefined when omitted
  TestValidator.predicate(
    "reason_detail should be null or undefined when omitted in create payload",
    reportWithoutDetail.reason_detail === null ||
      reportWithoutDetail.reason_detail === undefined,
  );

  // Contextual relations for second report
  TestValidator.predicate(
    "reported_member summary should be populated when reason_detail omitted",
    reportWithoutDetail.reported_member !== undefined &&
      reportWithoutDetail.reported_member !== null &&
      reportWithoutDetail.reported_member.id ===
        reportWithoutDetail.reported_memberuser_id,
  );
  TestValidator.predicate(
    "reporter_member summary should be populated when reason_detail omitted",
    reportWithoutDetail.reporter_member !== undefined &&
      reportWithoutDetail.reporter_member !== null &&
      reportWithoutDetail.reporter_member.id ===
        reportWithoutDetail.reporter_memberuser_id,
  );
}
