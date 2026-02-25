import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_admin_reports_decisions_create_report_decision } from "../../../generate/generate_random_community_platform_admin_reports_decisions_create_report_decision";
import { prepare_random_community_platform_reports_decision } from "../../../prepare/prepare_random_community_platform_reports_decision";

export async function test_api_reports_decision_create_approval_and_dismissal_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Approving a user report decision
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = "Passw0rd123!";
  const admin = await authorize_admin_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(admin);
  await authorize_admin_login(adminConnection, {
    body: {
      email: admin.email,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User join and login to prepare user for reporting
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = "UserPassw0rd!";
  const user = await authorize_user_join(userConnection, {
    body: { password: userPassword },
  });
  typia.assert(user);
  await authorize_user_login(userConnection, {
    body: {
      email: user.email,
      password: userPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. Create new user report
  const reportBody: ICommunityPlatformReport.ICreate = {
    description: RandomGenerator.paragraph({ sentences: 2 }),
    reportReasonId: typia.random<string & tags.Format<"uuid">>(),
    reportedPostId: typia.random<string & tags.Format<"uuid">>(),
    reportedCommentId: null,
  };
  const createReportResponse =
    await api.functional.communityPlatform.user.reports.create(userConnection, {
      body: reportBody,
    });
  typia.assert(createReportResponse);
  // 4. Submit report decision with status 'approved'
  const approvedDecision =
    await generate_random_community_platform_admin_reports_decisions_create_report_decision(
      adminConnection,
      {
        body: {
          reportId: createReportResponse.id,
          status: "approved",
          comment: "Approved for deletion",
        },
      },
    );
  typia.assert(approvedDecision);
  TestValidator.equals(
    "approved decision status",
    approvedDecision.decision,
    "approved",
  );
  TestValidator.equals(
    "approved decision reportId",
    approvedDecision.report_id,
    createReportResponse.id,
  );
  // 5. Verify reported content is deleted by checking report status
  TestValidator.equals(
    "approved report status",
    approvedDecision.report.status,
    "approved",
  );
  // 6. Verify report is no longer active (soft deleted check)
  TestValidator.predicate(
    "approved report is soft deleted",
    approvedDecision.report.deleted_at !== null,
  );
  // Scenario: Dismissing a user report decision
  // Create a new report for dismissal scenario
  const reportForDismissal =
    await api.functional.communityPlatform.user.reports.create(userConnection, {
      body: reportBody,
    });
  typia.assert(reportForDismissal);
  const dismissedDecision =
    await generate_random_community_platform_admin_reports_decisions_create_report_decision(
      adminConnection,
      {
        body: {
          reportId: reportForDismissal.id,
          status: "dismissed",
          comment: "Dismissed after review",
        },
      },
    );
  typia.assert(dismissedDecision);
  TestValidator.equals(
    "dismissed decision status",
    dismissedDecision.decision,
    "dismissed",
  );
  TestValidator.equals(
    "dismissed decision reportId",
    dismissedDecision.report_id,
    reportForDismissal.id,
  );
  // Verify content remains (report status pending)
  TestValidator.equals(
    "dismissed report status",
    dismissedDecision.report.status,
    "pending",
  );
  // Validate report is removed from active lists (soft deleted)
  TestValidator.predicate(
    "dismissed report is soft deleted",
    dismissedDecision.report.deleted_at !== null,
  );
  // Scenario: Authorization enforcement
  // Attempt createReportDecision without admin auth
  await TestValidator.httpError(
    "create report decision without auth",
    403,
    async () => {
      await api.functional.communityPlatform.admin.reports_decisions.createReportDecision(
        connection,
        {
          body: {
            reportId: dismissedDecision.report_id,
            status: "approved",
          },
        },
      );
    },
  );
  // Login as non-admin user
  const nonAdminConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(nonAdminConnection, {
    body: { password: userPassword },
  });
  typia.assert(anotherUser);
  await authorize_user_login(nonAdminConnection, {
    body: {
      email: anotherUser.email,
      password: userPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // Attempt createReportDecision as non-admin
  await TestValidator.httpError(
    "create report decision as non-admin",
    403,
    async () => {
      await generate_random_community_platform_admin_reports_decisions_create_report_decision(
        nonAdminConnection,
        {
          body: {
            reportId: dismissedDecision.report_id,
            status: "approved",
          },
        },
      );
    },
  );
}
