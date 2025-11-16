import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserReport";

/**
 * Validate that duplicate open user reports with identical uniqueness keys are
 * prevented, and that a new open report is allowed once the original is
 * resolved.
 *
 * Business workflow:
 *
 * 1. Create reporter and reported member users via /auth/memberUser/join.
 * 2. Log in as the reporter to ensure the reporter is the authenticated actor.
 * 3. As reporter, create an "open" spam report against the reported member.
 * 4. Attempt to create a second identical "open" spam report and assert it fails.
 * 5. Create an adminUser via /auth/adminUser/join.
 * 6. As admin, update the first report status to a terminal state (e.g.
 *    "resolved").
 * 7. Switch back to reporter via /auth/memberUser/login.
 * 8. As reporter again, create another "open" spam report and assert it now
 *    succeeds.
 */
export async function test_api_member_user_report_respects_duplicate_constraints(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create reporter memberUser
  const reporterJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://client.example.com/join/reporter",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reporter: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reporterJoinBody,
    });
  typia.assert(reporter);

  const reporterEmail: string = reporter.email;
  const reporterPassword: string = reporterJoinBody.password;

  // 2. Create reported memberUser
  const reportedJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://client.example.com/join/reported",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const reported: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: reportedJoinBody,
    });
  typia.assert(reported);

  // Ensure we are authenticated as the reporter before creating reports
  const reporterLoginBody = {
    identifier: reporterEmail,
    password: reporterPassword,
    ip: null,
    href: "https://client.example.com/login/reporter",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const reporterAfterInitialLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: reporterLoginBody,
    });
  typia.assert(reporterAfterInitialLogin);

  TestValidator.equals(
    "reporter login after setup should return same member user id",
    reporterAfterInitialLogin.id,
    reporter.id,
  );

  const reasonCategory = "spam";
  const openStatus = "open";
  const severity = "medium";

  // 3. As reporter, create first open spam report against reported member
  const firstReportCreateBody = {
    reported_memberuser_id: reported.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    status: openStatus,
    severity,
  } satisfies ICommunityPlatformUserReport.ICreate;

  const firstReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: firstReportCreateBody,
      },
    );
  typia.assert(firstReport);

  TestValidator.equals(
    "first report should target the reported member user",
    firstReport.reported_memberuser_id,
    reported.id,
  );

  // 4. Attempt to create a duplicate open report with identical keys and expect failure
  const duplicateReportCreateBody = {
    reported_memberuser_id: reported.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    status: openStatus,
    severity,
  } satisfies ICommunityPlatformUserReport.ICreate;

  await TestValidator.error(
    "duplicate open report with same key should be rejected",
    async () => {
      await api.functional.communityPlatform.memberUser.userReports.create(
        connection,
        {
          body: duplicateReportCreateBody,
        },
      );
    },
  );

  // 5. Create adminUser via admin join (connection now authenticated as admin)
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPass123!",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 6. As admin, update first report to a terminal status (resolved)
  const resolvedStatus = "resolved";

  const updateBody = {
    status: resolvedStatus,
  } satisfies ICommunityPlatformUserReport.IUpdate;

  const resolvedReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.adminUser.userReports.update(
      connection,
      {
        userReportId: firstReport.id,
        body: updateBody,
      },
    );
  typia.assert(resolvedReport);

  TestValidator.equals(
    "first report should have been updated to resolved status",
    resolvedReport.status,
    resolvedStatus,
  );

  // 7. Switch back to reporter via memberUser login
  const reporterAfterResolution: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: reporterLoginBody,
    });
  typia.assert(reporterAfterResolution);

  TestValidator.equals(
    "reporter login after resolution should return same member user id",
    reporterAfterResolution.id,
    reporter.id,
  );

  // 8. As reporter again, create another open spam report with same key values
  const secondReportCreateBody = {
    reported_memberuser_id: reported.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 4 }),
    status: openStatus,
    severity,
  } satisfies ICommunityPlatformUserReport.ICreate;

  const secondReport: ICommunityPlatformUserReport =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      {
        body: secondReportCreateBody,
      },
    );
  typia.assert(secondReport);

  // Validate that the new report is distinct and correctly linked
  TestValidator.notEquals(
    "second report id should differ from first report id",
    secondReport.id,
    firstReport.id,
  );

  TestValidator.equals(
    "second report should target the same reported member user",
    secondReport.reported_memberuser_id,
    reported.id,
  );

  TestValidator.equals(
    "second report should keep the same reason category",
    secondReport.reason_category,
    reasonCategory,
  );

  TestValidator.equals(
    "second report should have open status after first resolved",
    secondReport.status,
    openStatus,
  );
}
