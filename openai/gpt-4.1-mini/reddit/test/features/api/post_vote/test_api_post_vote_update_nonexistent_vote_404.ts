import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
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

export async function test_api_post_vote_update_nonexistent_vote_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "securePassword123",
      username: "user_" + Math.random().toString(36).substring(2, 8),
      displayName: "User " + Math.random().toString(36).substring(2, 8),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Update userConnection authorization headers with new token
  userConnection.headers = { Authorization: `Bearer ${user.token.access}` };
  // 2. Attempt to update vote with random non-existent postVoteId
  const nonExistentPostVoteId = typia.random<string & tags.Format<"uuid">>();
  const body: ICommunityPlatformPostVoteOfUser.IUpdate = {
    vote_type: "upvote",
  };
  // Expect an error with 404 status when updating non-existent vote
  await TestValidator.httpError(
    "update non-existent post vote returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.postVotes.users.updatePostVote(
        userConnection,
        {
          postVoteId: nonExistentPostVoteId,
          body,
        },
      );
    },
  );
}
