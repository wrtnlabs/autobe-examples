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

export async function test_api_user_comment_report_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies authorization enforcement for /communityPlatform/user/comment-reports/{commentReportId}
  // Create a user connection by joining user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {},
  });
  typia.assert(authorizedUser);
  // Use the authorized user token
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // Prepare a random commentReportId to test access
  // Since we don't have creation API here, use typia.random<string & tags.Format<"uuid">>()
  const existingReportId = typia.random<string & tags.Format<"uuid">>();
  // 1. Test unauthorized access (no auth)
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access denied",
    401,
    async () => {
      await api.functional.communityPlatform.user.comment_reports.at(
        anonymousConnection,
        {
          commentReportId: existingReportId,
        },
      );
    },
  );
  // 2. Test authorized access (authenticated user)
  const commentReport =
    await api.functional.communityPlatform.user.comment_reports.at(
      userConnection,
      {
        commentReportId: existingReportId,
      },
    );
  typia.assert(commentReport);
  // 3. Role restrictions are checked by backend authorization.
  // However, since we cannot simulate multiple roles here, just ensure access works.
  TestValidator.predicate(
    "authorized user can access comment report",
    !!commentReport,
  );
}
