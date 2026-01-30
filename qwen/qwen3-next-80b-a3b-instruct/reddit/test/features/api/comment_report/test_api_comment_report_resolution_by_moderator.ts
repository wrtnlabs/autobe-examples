import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReport";
import type { ICommunityBbsCommentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReportStatus";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { prepare_random_community_bbs_comment_report_status } from "../../../prepare/prepare_random_community_bbs_comment_report_status";
import { generate_random_community_bbs_admin_comment_report_statuses_create } from "../../../generate/generate_random_community_bbs_admin_comment_report_statuses_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_report_resolution_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  // Step 2: Login as admin to establish context
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Step 3: Create the required 'pending' comment report status
  const pendingStatus =
    await generate_random_community_bbs_admin_comment_report_statuses_create(
      adminConnection,
      {
        body: {
          status_name: "pending",
          description: "Comment report is pending moderator review",
          is_active: true,
        },
      },
    );
  typia.assert(pendingStatus);
  // Step 4: Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPasswordHash = RandomGenerator.alphaNumeric(32);
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
    } satisfies ICommunityBbsModerator.IJoin,
  });
  // Step 5: Login as moderator to establish context
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password_hash: moderatorPasswordHash,
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // Step 6: Generate a random report ID for testing the update functionality
  // Note: Since there is no API to create a comment report, we assume one exists
  // This test validates only the update functionality with a generated reportId
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Step 7: Update comment report status from 'pending' to 'resolved' by moderator
  // This assumes the report already exists in pending state
  const updatedReport =
    await api.functional.communityBbs.moderator.comment_reports.update(
      moderatorConnection,
      {
        reportId,
        body: {
          status: "resolved" as const,
        } satisfies ICommunityBbsCommentReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 8: Validate the report status was updated to 'resolved' and updated_at changed
  TestValidator.equals(
    "report status should be resolved",
    updatedReport.status,
    "resolved",
  );
  TestValidator.predicate(
    "updated_at should be modified and after created_at",
    updatedReport.updated_at > updatedReport.created_at,
  );
}
