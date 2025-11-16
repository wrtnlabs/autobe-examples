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
 * Validate that an authenticated member user can delete their own pending
 * appeal that is associated with a report they filed.
 *
 * Business flow:
 *
 * 1. Register a new member user via auth.memberUser.join, which both creates the
 *    member and configures the connection with an access token.
 * 2. As that member user, create a new moderation report via
 *    communityPlatform.memberUser.reports.create.
 * 3. Still as the same member user, create an appeal for that report via
 *    communityPlatform.memberUser.reports.appeals.create.
 * 4. Delete the created appeal using
 *    communityPlatform.memberUser.reports.appeals.erase with the report and
 *    appeal identifiers.
 *
 * Validations:
 *
 * - All creation responses (join, report, appeal) conform to their DTO types
 *   using typia.assert.
 * - The appeal is correctly linked to the created report.
 * - The erase endpoint completes successfully without throwing (void return).
 */
export async function test_api_memberuser_appeal_delete_own_pending_appeal(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain authenticated context.
  const joinRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorizedMember: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequest,
    });
  typia.assert(authorizedMember);

  // 2. Create a report as that member user.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
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

  // 3. Create an appeal for that report.
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

  // Validate association between appeal and report via embedded report summary.
  TestValidator.equals(
    "appeal is linked to the created report",
    createdAppeal.report.id,
    createdReport.id,
  );

  // 4. Delete the appeal using erase with the reportId and appealId.
  await api.functional.communityPlatform.memberUser.reports.appeals.erase(
    connection,
    {
      reportId: createdReport.id,
      appealId: createdAppeal.id,
    },
  );

  // If we reached here without an error, consider deletion successful.
  TestValidator.predicate("erase appeal completed without throwing", true);
}
