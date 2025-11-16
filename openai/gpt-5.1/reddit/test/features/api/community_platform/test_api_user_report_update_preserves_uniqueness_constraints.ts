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
 * Ensure admin-driven user report updates cannot violate uniqueness
 * constraints.
 *
 * Business rule under test:
 *
 * - The user_reports table enforces a uniqueness constraint on
 *   (reporter_memberuser_id, reported_memberuser_id, reason_category, status).
 * - Creating or updating a report must not result in two active rows with the
 *   same reporter, same reported user, same reason_category, and same status.
 *
 * This test simulates a realistic cross-actor workflow:
 *
 * 1. A member user (Reporter R) joins the platform.
 * 2. Another member user (Reported U) joins the platform.
 * 3. An adminUser A is created to exercise privileged update APIs.
 * 4. Reporter R authenticates and files two reports against Reported U with the
 *    same reason_category but different status values.
 * 5. AdminUser A authenticates and attempts to update Report 2 so that its status
 *    becomes equal to Report 1’s status while keeping the same reason_category,
 *    which would collide on the uniqueness key.
 * 6. The update is expected to fail with a business-level error, preserving the
 *    uniqueness invariant.
 */
export async function test_api_user_report_update_preserves_uniqueness_constraints(
  connection: api.IConnection,
) {
  // 1. Create Reporter R (memberUser)
  const reporterJoinInput = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const reporterJoin = await api.functional.auth.memberUser.join(connection, {
    body: reporterJoinInput,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterJoin);

  // 2. Create Reported U (memberUser) with a different email/username
  const reportedJoinInputBase =
    typia.random<ICommunityPlatformMemberuser.IJoin>();
  const reportedJoinInput: ICommunityPlatformMemberuser.IJoin = {
    ...reportedJoinInputBase,
    // Ensure unique email and username distinct from reporter
    email:
      reportedJoinInputBase.email === reporterJoinInput.email
        ? `alt+${reportedJoinInputBase.email}`
        : reportedJoinInputBase.email,
    username:
      reportedJoinInputBase.username === reporterJoinInput.username
        ? `${reportedJoinInputBase.username}_alt`
        : reportedJoinInputBase.username,
  };
  const reportedJoin = await api.functional.auth.memberUser.join(connection, {
    body: reportedJoinInput,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reportedJoin);

  // Sanity: reporter and reported must be different users
  TestValidator.notEquals(
    "reporter and reported must have different ids",
    reporterJoin.id,
    reportedJoin.id,
  );

  // 3. Create adminUser A
  const adminJoinInput =
    typia.random<ICommunityPlatformAdminUserJoin.IRequest>();
  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinInput,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 4. Authenticate as Reporter R
  const reporterLoginInput: ICommunityPlatformMemberuser.ILogin = {
    identifier: reporterJoinInput.email,
    password: reporterJoinInput.password,
    ip: reporterJoinInput.ip ?? null,
    href: reporterJoinInput.href,
    referrer: reporterJoinInput.referrer,
  };
  const reporterLogin = await api.functional.auth.memberUser.login(connection, {
    body: reporterLoginInput,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(reporterLogin);

  // 5. As Reporter R, create two reports against Reported U
  const reasonCategory = "harassment";
  const statusOpen = "open";
  const statusResolved = "resolved";

  const report1CreateBody = {
    reported_memberuser_id: reportedJoin.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    status: statusOpen,
    severity: "medium",
  } satisfies ICommunityPlatformUserReport.ICreate;
  const report1 =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      { body: report1CreateBody },
    );
  typia.assert<ICommunityPlatformUserReport>(report1);

  const report2CreateBody = {
    reported_memberuser_id: reportedJoin.id,
    reason_category: reasonCategory,
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    status: statusResolved,
    severity: "high",
  } satisfies ICommunityPlatformUserReport.ICreate;
  const report2 =
    await api.functional.communityPlatform.memberUser.userReports.create(
      connection,
      { body: report2CreateBody },
    );
  typia.assert<ICommunityPlatformUserReport>(report2);

  // Sanity: ensure reports share same reporter, reported, and reason_category,
  // but differ in status
  TestValidator.equals(
    "both reports share same reported_memberuser_id",
    report1.reported_memberuser_id,
    report2.reported_memberuser_id,
  );
  TestValidator.equals(
    "both reports share same reason_category",
    report1.reason_category,
    report2.reason_category,
  );
  TestValidator.notEquals(
    "reports must start with different status values",
    report1.status,
    report2.status,
  );

  // 6. Authenticate as adminUser A
  const adminLoginInput: ICommunityPlatformAdminUserLogin.IRequest = {
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
    ip: adminJoinInput.email.includes("@") ? null : null,
    href: reporterJoinInput.href,
    referrer: reporterJoinInput.referrer,
  };
  const adminLogin = await api.functional.auth.adminUser.login(connection, {
    body: adminLoginInput,
  });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminLogin);

  // 7. Attempt conflicting update on Report 2: set status to same as Report 1
  const conflictingUpdateBody = {
    status: statusOpen,
  } satisfies ICommunityPlatformUserReport.IUpdate;

  await TestValidator.error(
    "admin report update must reject uniqueness-violating change",
    async () => {
      await api.functional.communityPlatform.adminUser.userReports.update(
        connection,
        {
          userReportId: report2.id,
          body: conflictingUpdateBody,
        },
      );
    },
  );
}
