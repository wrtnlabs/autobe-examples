import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
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

export async function test_api_user_comment_report_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  // Use userConnection with headers automatically set by authorize_user_join
  // 2. Attempt to fetch a non-existent comment report with a random UUID and expect 404 error
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "non-existent comment report returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.comment_reports.at(
        userConnection,
        {
          commentReportId: nonExistentId,
        },
      );
    },
  );
  // 3. Attempt unauthorized fetch without token
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.communityPlatform.user.comment_reports.at(
        anonymousConnection,
        {
          commentReportId: nonExistentId,
        },
      );
    },
  );
}
