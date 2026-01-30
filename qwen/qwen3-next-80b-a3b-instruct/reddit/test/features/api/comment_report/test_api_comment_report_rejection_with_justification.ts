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
export async function test_api_comment_report_rejection_with_justification(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and join admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a 'pending' comment report status using admin connection
  const pendingStatus: ICommunityBbsCommentReportStatus =
    await generate_random_community_bbs_admin_comment_report_statuses_create(
      adminConnection,
      {
        body: {
          status_name: "pending",
          description: "Comment report awaiting moderator review",
          is_active: true,
        },
      },
    );
  typia.assert(pendingStatus);
  TestValidator.equals(
    "pending status created",
    pendingStatus.status_name,
    "pending",
  );
  // Step 3: Create moderator connection and join moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: passwordHash,
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 4: Authenticate moderator to obtain token
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderator.email,
      password_hash: passwordHash,
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // moderatorConnection.headers is now updated with auth token
  // Step 5: Generate a valid report ID
  const reportId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 6: Update the report status to 'rejected' with justification
  const justification = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedReport: ICommunityBbsCommentReport =
    await api.functional.communityBbs.moderator.comment_reports.update(
      moderatorConnection,
      {
        reportId,
        body: {
          status: "rejected",
          justification,
        } satisfies ICommunityBbsCommentReport.IUpdate,
      },
    );
  typia.assert(updatedReport);
  // Step 7: Validate the rejection was successful
  TestValidator.equals(
    "report status updated to rejected",
    updatedReport.status,
    "rejected",
  );
  TestValidator.equals(
    "justification was saved",
    updatedReport.justification,
    justification,
  );
}
