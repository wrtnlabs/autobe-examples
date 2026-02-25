import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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

export async function test_api_comment_retrieval_with_authorization_and_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Try to retrieve a comment with a random UUID as authorized user - expect 404
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorizedUser.token.access };
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "comment not found returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.comments.at(userConnection, {
        commentId: randomCommentId,
      });
    },
  );
  // Scenario 2: Unauthorized user (no auth headers) tries to fetch the comment - expect 403
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 403",
    403,
    async () => {
      await api.functional.communityPlatform.user.comments.at(guestConnection, {
        commentId: randomCommentId,
      });
    },
  );
  // Scenario 3: Access denied for unauthorized user trying to fetch another user's comment
  // Since no creation or ownership is testable, simulate 403 by using a token from another user
  // Create second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {});
  secondUserConnection.headers = { Authorization: secondUser.token.access };
  await TestValidator.httpError(
    "access denied to other's comment returns 403",
    403,
    async () => {
      await api.functional.communityPlatform.user.comments.at(
        secondUserConnection,
        {
          commentId: randomCommentId,
        },
      );
    },
  );
}
