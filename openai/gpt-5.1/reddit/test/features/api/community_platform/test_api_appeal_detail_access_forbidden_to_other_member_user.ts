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
 * Verify that memberUser-scoped appeal detail endpoint enforces ownership-based
 * access control.
 *
 * Business goal:
 *
 * - Ensure that the appeal detail API GET
 *   /communityPlatform/memberUser/reports/{reportId}/appeals/{appealId} returns
 *   the appeal to the member user who created it, but rejects access when
 *   another member user attempts to read the same appeal through the memberUser
 *   namespace.
 *
 * Test flow (adapted to available SDK):
 *
 * 1. Member A joins (creates a member user account) via auth.memberUser.join.
 * 2. While authenticated as Member A, create a report using
 *    communityPlatform.memberUser.reports.create.
 * 3. Still as Member A, create an appeal for that report using
 *    communityPlatform.memberUser.reports.appeals.create.
 * 4. As Member A, immediately fetch the appeal detail via
 *    communityPlatform.memberUser.reports.appeals.at and verify success.
 * 5. Member B joins via auth.memberUser.join, switching the connection’s
 *    Authorization header to Member B (handled automatically by SDK).
 * 6. As Member B, attempt to fetch Member A’s appeal detail via the same
 *    appeals.at endpoint and assert that the call results in an error,
 *    indicating access is forbidden for non-owners.
 *
 * Constraints and rules:
 *
 * - Use only provided SDK functions and DTOs.
 * - Do not inspect HTTP status codes; just assert that an error is thrown for the
 *   unauthorized access attempt.
 * - All request payloads must be type-correct. No type-error scenarios.
 */
export async function test_api_appeal_detail_access_forbidden_to_other_member_user(
  connection: api.IConnection,
) {
  // 1. Member A joins the platform
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
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
    severity: "medium",
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

  // 3. Member A creates an appeal for that report
  const appealCreateBody = {
    appeal_scope: "sanction",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const createdAppeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.create(
      connection,
      {
        reportId: report.id,
        body: appealCreateBody,
      },
    );
  typia.assert(createdAppeal);

  // Basic sanity checks on created appeal
  TestValidator.equals(
    "created appeal should reference the correct report",
    createdAppeal.report.id,
    report.id,
  );
  TestValidator.equals(
    "created appeal scope should match request",
    createdAppeal.appeal_scope,
    appealCreateBody.appeal_scope,
  );
  TestValidator.equals(
    "created appeal reason summary should match request",
    createdAppeal.reason_summary,
    appealCreateBody.reason_summary,
  );

  // 4. Member A fetches the appeal detail successfully
  const appealAsOwner: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.reports.appeals.at(
      connection,
      {
        reportId: report.id,
        appealId: createdAppeal.id,
      },
    );
  typia.assert(appealAsOwner);

  TestValidator.equals(
    "owner fetch should return same appeal id",
    appealAsOwner.id,
    createdAppeal.id,
  );
  TestValidator.equals(
    "owner fetch should return same report id",
    appealAsOwner.report.id,
    report.id,
  );

  // 5. Member B joins, switching the connection to a different member user
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  TestValidator.notEquals(
    "Member B must be a different user from Member A",
    memberB.id,
    memberA.id,
  );

  // 6. As Member B, attempting to access Member A's appeal should fail
  await TestValidator.error(
    "non-owner member user should not access another member's appeal detail",
    async () => {
      await api.functional.communityPlatform.memberUser.reports.appeals.at(
        connection,
        {
          reportId: report.id,
          appealId: createdAppeal.id,
        },
      );
    },
  );
}
