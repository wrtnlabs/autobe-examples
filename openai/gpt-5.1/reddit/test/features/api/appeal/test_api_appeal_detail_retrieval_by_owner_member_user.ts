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
 * Validate that the owner member user can retrieve full appeal details.
 *
 * Business context:
 *
 * - Member users can submit moderation reports and later file appeals against
 *   moderation decisions or sanctions tied to those reports.
 * - The owner (appellant) of an appeal should be able to fetch the appeal-detail
 *   view, which returns ICommunityPlatformAppeal enriched with its associated
 *   report summary and related moderation context.
 *
 * Scenario steps:
 *
 * 1. Register a new member user using the join endpoint. This both creates the
 *    member and establishes an authenticated context (Authorization header).
 * 2. As this member, create a community report via POST
 *    /communityPlatform/memberUser/reports with an
 *    ICommunityPlatformReport.ICreate body.
 * 3. Still as the same authenticated member, create an appeal for that report
 *    using POST /communityPlatform/memberUser/reports/{reportId}/appeals with
 *    an ICommunityPlatformAppeal.ICreate body. Capture the returned appeal and
 *    its embedded report summary.
 * 4. Call GET /communityPlatform/memberUser/reports/{reportId}/appeals/{appealId}
 *    using the same member context.
 * 5. Validate that:
 *
 *    - The response conforms to ICommunityPlatformAppeal (typia.assert).
 *    - The appeal id from GET matches the id from the POST create response.
 *    - The embedded report summary id matches both the original report.id and the
 *         report summary inside the POST-created appeal.
 *    - Lifecycle fields such as appeal_status, appeal_scope, created_at, updated_at
 *         are present and non-empty strings.
 *    - Reason fields (reason_summary and details) in the retrieved appeal match
 *         those sent during creation.
 */
export async function test_api_appeal_detail_retrieval_by_owner_member_user(
  connection: api.IConnection,
) {
  // 1. Register member user (join) to establish authenticated context
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoinRequest>();

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a report as this member user
  const reportCreateBody = typia.random<ICommunityPlatformReport.ICreate>();

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      { body: reportCreateBody },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 3. Create an appeal for the created report
  const appealCreateBody = typia.random<ICommunityPlatformAppeal.ICreate>();

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(createdAppeal);

  // Sanity checks between report and createdAppeal
  TestValidator.equals(
    "created appeal's report summary id should match report.id",
    createdAppeal.report.id,
    report.id,
  );

  // 4. Retrieve the appeal details via GET
  const fetchedAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.at(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
      },
    );
  typia.assert<ICommunityPlatformAppeal>(fetchedAppeal);

  // 5. Validate id consistency (POST vs GET)
  TestValidator.equals(
    "fetched appeal id should equal created appeal id",
    fetchedAppeal.id,
    createdAppeal.id,
  );

  // Validate report linkage consistency across report, createdAppeal, fetchedAppeal
  TestValidator.equals(
    "fetched appeal's report summary id should match original report.id",
    fetchedAppeal.report.id,
    report.id,
  );

  TestValidator.equals(
    "fetched appeal's report summary id should match created appeal's report summary id",
    fetchedAppeal.report.id,
    createdAppeal.report.id,
  );

  // Validate lifecycle and reason fields
  TestValidator.predicate(
    "appeal_status should be a non-empty string",
    typeof fetchedAppeal.appeal_status === "string" &&
      fetchedAppeal.appeal_status.length > 0,
  );

  TestValidator.predicate(
    "appeal_scope should be a non-empty string",
    typeof fetchedAppeal.appeal_scope === "string" &&
      fetchedAppeal.appeal_scope.length > 0,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof fetchedAppeal.created_at === "string" &&
      fetchedAppeal.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof fetchedAppeal.updated_at === "string" &&
      fetchedAppeal.updated_at.length > 0,
  );

  // resolved_at is optional; when present, ensure it's a non-empty string
  if (fetchedAppeal.resolved_at !== undefined) {
    TestValidator.predicate(
      "resolved_at, when present, should be a non-empty string",
      typeof fetchedAppeal.resolved_at === "string" &&
        fetchedAppeal.resolved_at.length > 0,
    );
  }

  // reason_summary and details should match creation payload
  TestValidator.equals(
    "reason_summary should match creation payload",
    fetchedAppeal.reason_summary,
    appealCreateBody.reason_summary,
  );

  TestValidator.equals(
    "details should match creation payload",
    fetchedAppeal.details,
    appealCreateBody.details,
  );
}
