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

export async function test_api_community_platform_admin_reported_content_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform.
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuthorized);
  // 2. User joins and logs in
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {});
  typia.assert(userAuthorized);
  // 3. User creates a user report via POST /communityPlatform/user/reports
  // Mimic realistic Create Report body
  const reportBody = {
    // We must provide a valid report create body.
    // The exact shape of ICommunityPlatformReport.ICreate is any | any, so assume minimal structure to create report
    // Use placeholders or simple mock values as needed
    contentType: "post",
    contentId: typia.random<string & tags.Format<"uuid">>(),
    reportReasonId: typia.random<string & tags.Format<"uuid">>(),
    description: "Test report description",
  } satisfies ICommunityPlatformReport.ICreate;
  const report = await api.functional.communityPlatform.user.reports.create(
    userConnection,
    {
      body: reportBody,
    },
  );
  typia.assert(report);
  // 4. Attempt GET on /communityPlatform/admin/reports/{reportId}/reportedContents/{nonExistentReportedContentId}
  // Use non-existent reportedContentId
  const fakeReportedContentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should throw 404 when reported content not found",
    404,
    async () => {
      await api.functional.communityPlatform.admin.reports.reportedContents.at(
        adminConnection,
        {
          reportId: report.id,
          reportedContentId: fakeReportedContentId,
        },
      );
    },
  );
}
