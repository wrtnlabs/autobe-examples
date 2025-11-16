import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate deletion behavior for non-existent appeals under a real report.
 *
 * Business context: Platform administrators can manage appeals tied to
 * moderation reports via DELETE
 * /communityPlatform/platformAdmin/reports/{reportId}/appeals/{appealId}. When
 * a platform admin targets an appealId that does not exist for a given report,
 * the API must reject the operation with an error rather than silently succeed.
 * This test focuses on that failure path while ensuring all interactions use
 * valid, type-safe DTOs.
 *
 * Scenario steps:
 *
 * 1. Register a platform admin (join) to obtain an authenticated admin actor.
 * 2. Register a member user (join) to act as a reporter.
 * 3. As the member user, create a real report using POST
 *    /communityPlatform/memberUser/reports and capture its reportId.
 * 4. Using the platform admin actor, attempt to delete an appeal for that report
 *    using a randomly generated, non-existent appealId.
 * 5. Wrap the delete call in TestValidator.error to assert that the operation
 *    fails for the non-existent appealId while the reportId itself is valid.
 *
 * Due to limited SDK surface (no read API for appeals), we cannot explicitly
 * re-fetch appeals or reports to prove that data remains unchanged; instead, we
 * focus on type-safe request construction and verifying that the erase endpoint
 * does not succeed when given a clearly non-existent appealId.
 */
export async function test_api_platformadmin_appeal_delete_on_nonexistent_appeal(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and ensure response type
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(adminAuthorized);

  // 2. Register a member user on a separate connection instance
  const memberConnection: api.IConnection = {
    ...connection,
  };

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    ip: RandomGenerator.mobile(),
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(memberConnection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 3. As the member user, create a real report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "low",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const createdReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      memberConnection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(createdReport);

  // 4. Using the platform admin actor, attempt to delete a non-existent appeal
  const nonExistentAppealId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "erase should fail for non-existent appeal",
    async () => {
      await api.functional.communityPlatform.platformAdmin.reports.appeals.erase(
        connection,
        {
          reportId: createdReport.id,
          appealId: nonExistentAppealId,
        },
      );
    },
  );
}
