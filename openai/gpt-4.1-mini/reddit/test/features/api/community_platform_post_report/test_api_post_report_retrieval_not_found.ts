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

export async function test_api_post_report_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user for authorization
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorizedUser: ICommunityPlatformUser.IAuthorized =
    await authorize_user_join(userJoinConnection, { body: {} });
  typia.assert(authorizedUser);
  // 2. Setup authorized connection with user token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 3. Generate a random non-existent postReportId (UUID)
  const fakePostReportId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the post report by non-existent id, expecting HTTP error
  await TestValidator.httpError(
    "retrieving non-existent post report should fail with not found",
    404,
    async () => {
      await api.functional.communityPlatform.user.post_reports.at(
        userConnection,
        {
          postReportId: fakePostReportId,
        },
      );
    },
  );
}
