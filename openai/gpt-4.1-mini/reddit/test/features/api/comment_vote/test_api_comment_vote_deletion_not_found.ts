import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_comment_vote_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion attempt for a non-existent comment vote
  // Create user connection by joining a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers = {
    ...(userConnection.headers ?? {}),
    Authorization: authorizedUser.token.access,
  };
  // Attempt to delete a non-existent comment vote with a random UUID
  const randomCommentVoteId = typia.random<string & tags.Format<"uuid">>();
  // Expect HTTP 404 Not Found error
  await TestValidator.httpError(
    "comment vote deletion not found",
    404,
    async () => {
      await api.functional.communityPlatform.commentVotes.erase(
        userConnection,
        {
          commentVoteId: randomCommentVoteId,
        },
      );
    },
  );
}
