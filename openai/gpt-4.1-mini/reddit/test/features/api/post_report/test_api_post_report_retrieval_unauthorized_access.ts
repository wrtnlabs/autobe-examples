import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_report_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // This test checks that unauthorized access to a post report by an unauthenticated user or an authenticated user without moderator/admin rights is denied.
  // 1. Attempt to call the endpoint WITHOUT authorization headers using the base connection and expect an HTTP 401 or 403 error
  await TestValidator.httpError(
    "unauthorized access without token",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.post_reports.at(connection, {
        postReportId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 2. Join as a normal user (non-mod/admin) to obtain an authorization token
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // 3. Attempt to call the endpoint WITH a normal user's token and expect an HTTP 401 or 403 error
  await TestValidator.httpError(
    "unauthorized access with normal user token",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.post_reports.at(
        userConnection,
        {
          postReportId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
