import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_community_platform_report_deletion_by_authorized_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator actor connection and authorize join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // Because there is no report creation API, we cannot create a real report to delete
  // So we test deletion with a non-existent reportId to check 404 and error message
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent report and expect 404 error
  await TestValidator.httpError(
    "delete non-existent report returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.reports.erase(
        moderatorConnection,
        {
          reportId: nonExistentReportId,
        },
      );
    },
  );
}
