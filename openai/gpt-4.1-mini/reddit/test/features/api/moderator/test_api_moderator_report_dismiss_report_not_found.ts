import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_dismiss_report_not_found(
  connection: api.IConnection,
) {
  // 1. Moderator registration for authentication and authorization
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Attempt to dismiss a non-existent report using random UUID
  const nonExistentReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Validate that dismissing non-existent report throws an error
  await TestValidator.error("dismiss non-existent report", async () => {
    await api.functional.communityPlatform.moderator.reports.dismiss(
      moderatorConnection,
      { reportId: nonExistentReportId },
    );
  });
}
