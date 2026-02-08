import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_report_dismiss_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderatorAuth);
  // Update connection headers with moderator token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuth.token.access}`,
  };
  // 2. Attempt to dismiss a report with a random UUID that does not exist
  const fakeReportId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the dismiss API and expect an error indicating the report is missing
  await TestValidator.httpError(
    "dismiss non-existent report",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.community.reports.dismiss(
        moderatorConnection,
        { reportId: fakeReportId },
      );
    },
  );
}
