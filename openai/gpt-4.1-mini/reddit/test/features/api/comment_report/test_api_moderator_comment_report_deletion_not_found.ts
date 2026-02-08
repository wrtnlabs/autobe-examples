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

export async function test_api_moderator_comment_report_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins to get authorized connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Generate a random UUID that definitely does not exist
  const nonExistentCommentReportId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete non-existent comment report and expect 404 error
  await TestValidator.httpError(
    "delete non-existent comment report",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.comment_reports.erase(
        moderatorConnection,
        {
          commentReportId: nonExistentCommentReportId,
        },
      );
    },
  );
}
