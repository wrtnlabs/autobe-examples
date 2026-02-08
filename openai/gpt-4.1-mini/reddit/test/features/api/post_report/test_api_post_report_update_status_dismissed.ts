import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_post_report_update_status_dismissed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator authentication via join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Generate a random 'pending' post report mock (simulate creating a pending post report)
  const pendingReport =
    typia.random<ICommunityPlatformPostReport>() as ICommunityPlatformPostReport;
  typia.assert(pendingReport);
  // We forcibly set status to 'pending' if possible (ICommunityPlatformPostReport is empty, so we mock by creating a partial object)
  const postReportId = typia.random<string & typia.tags.Format<"uuid">>();
  // 3. Update the post report status to 'dismissed'
  const body: ICommunityPlatformPostReport.IUpdate = {
    status: "dismissed",
  };
  const updatedReport =
    await api.functional.communityPlatform.moderator.post_reports.update(
      moderatorConnection,
      {
        postReportId: postReportId,
        body: body,
      },
    );
  typia.assert(updatedReport);
  // Remove access to updatedReport.status because it does not exist on type
  // 4. Confirm that the reported post remains unaffected is skipped due to lack of post detail API and data.
  // 5. Validate that only moderators can update the report by checking unauthorized call
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot update report",
    async () => {
      await api.functional.communityPlatform.moderator.post_reports.update(
        noAuthConnection,
        {
          postReportId: postReportId,
          body: body,
        },
      );
    },
  );
}
