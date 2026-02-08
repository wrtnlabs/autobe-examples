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

export async function test_api_post_report_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator via join
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = authorized.token.access;
  // 2. Attempt to update a non-existing post report
  const nonExistentPostReportId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = typia.random<ICommunityPlatformPostReport.IUpdate>();
  // 3. Expect 404 error on update
  await TestValidator.httpError(
    "update non-existent post report returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.post_reports.update(
        moderatorConnection,
        {
          postReportId: nonExistentPostReportId,
          body: updateBody,
        },
      );
    },
  );
}
