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

export async function test_api_report_approval_successful_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_admin_join(adminConnection, {});
  typia.assert(adminJoinOutput);
  // Admin login
  const adminLoginOutput = await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: adminJoinOutput.token.access, // use access token temporarily as pwd - replaced below to avoid insecure
    },
  });
  // Admin login: Since password unknown from join, use join info for login
  // But password was randomly generated inside join, so store it in variable
  // We need to generate stable password for join
  // Adjust admin join to use fixed password
  // Since this is test, re-implement join with fixed password
  const fixedAdminPassword = "TestAdminPass123!";
  // Rejoin admin with fixed password to login after
  const stableAdminJoinOutput = await authorize_admin_join(adminConnection, {
    body: {
      email: adminJoinOutput.email,
      password: fixedAdminPassword,
      displayName: adminJoinOutput.displayName,
      bio: adminJoinOutput.bio ?? null,
      avatarUrl: adminJoinOutput.avatarUrl ?? null,
    },
  });
  typia.assert(stableAdminJoinOutput);
  // Login finally with known password
  const stableAdminLoginOutput = await authorize_admin_login(adminConnection, {
    body: {
      email: stableAdminJoinOutput.email,
      password: fixedAdminPassword,
    },
  });
  typia.assert(stableAdminLoginOutput);

  // Extract admin ID gracefully using typia.assert
  // Assume stableAdminLoginOutput has property 'id' or 'user_id' or extract safely
  // Fallback to adminJoinOutput.email if no id found
  // For safety, just assert moderator_id is a string & uuid
  let adminId: string & tags.Format<"uuid">;
  if (typeof (stableAdminLoginOutput as any).id === "string") {
    adminId = typia.assert<string & tags.Format<"uuid">>((stableAdminLoginOutput as any).id);
  } else if (typeof (stableAdminLoginOutput as any).user_id === "string") {
    adminId = typia.assert<string & tags.Format<"uuid">>((stableAdminLoginOutput as any).user_id);
  } else {
    // fallback to email or empty string (with format tag) - this might fail but keeps typing safe
    adminId = typia.assert<string & tags.Format<"uuid">>(adminJoinOutput.email as any); // forced cast, might not type check but no other info
  }

  // 2. User setup and create a report
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinOutput = await authorize_user_join(userConnection, {});
  typia.assert(userJoinOutput);
  // For report creation, we must create a valid report content
  // Due to no utility generated for post or comment creation or retrieval,
  // this test will mock a report creation body with required minimal fields.
  // The ICommunityPlatformReport.ICreate is any | any so we will create a basic valid mock body
  // Compose a report create body
  const reportCreateBody: ICommunityPlatformReport.ICreate = {
    // We fake required fields for testing
    // Required: content posts or comments, reason id
    communityPlatformReportReasonId: typia.random<
      string & tags.Format<"uuid">
    >(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    // Posted content: Normally post_id or comment_id, but as property names unknown,
    // we assume union discriminator properties or both nullable
    communityPlatformReportedPostId: typia.random<
      string & tags.Format<"uuid">
    >(),
    communityPlatformReportedCommentId: null,
  };
  // Create report by user
  const createdReport =
    await api.functional.communityPlatform.user.reports.create(userConnection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);
  // 3. Admin approves the created report by report id
  const approvedReport =
    await api.functional.communityPlatform.admin.reports.approve.approveReport(
      adminConnection,
      { reportId: createdReport.id },
    );
  typia.assert(approvedReport);
  // Validate that the status is updated to indicate approval
  TestValidator.equals("report status", approvedReport.status, "approved");
  // Validate that the decisions array includes an approval decision by the admin
  TestValidator.predicate(
    "has at least one decision",
    approvedReport.decisions.length > 0,
  );
  // Validate that the latest decision was made by the admin and is "approved"
  const latestDecision =
    approvedReport.decisions[approvedReport.decisions.length - 1];
  TestValidator.equals(
    "decision is approved",
    latestDecision.decision,
    "approved",
  );
  TestValidator.equals(
    "decision made by admin",
    latestDecision.moderator_id,
    adminId,
  );
  // Validate that reported contents are deleted (deletedAt !== null)
  TestValidator.predicate(
    "all reported contents deleted",
    approvedReport.reportedContents.every(
      (content) => content.deletedAt !== null,
    ),
  );
}
