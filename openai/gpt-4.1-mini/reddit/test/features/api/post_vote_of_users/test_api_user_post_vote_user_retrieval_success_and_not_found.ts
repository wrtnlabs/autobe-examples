import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUsers";
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

export async function test_api_user_post_vote_user_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and obtains authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // User connection with updated Authorization header
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Use a valid postVoteId to retrieve user post vote details
  //    Here we simulate creation or directly generate a plausible UUID for testing
  const validPostVoteId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the user vote details with a valid postVoteId
  const userVoteDetails =
    await api.functional.communityPlatform.user.post_votes.users.at(
      userConnection,
      { postVoteId: validPostVoteId },
    );
  typia.assert(userVoteDetails);
  // 3. Test error case: request user vote details with a non-existent postVoteId
  const nonExistentPostVoteId = "11111111-1111-1111-1111-111111111111";
  await TestValidator.httpError(
    "non-existent postVoteId returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.post_votes.users.at(
        userConnection,
        {
          postVoteId: nonExistentPostVoteId,
        },
      );
    },
  );
  // 4. Test authorization enforcement: use base connection with no auth header
  await TestValidator.httpError(
    "unauthorized access returns 401",
    401,
    async () => {
      await api.functional.communityPlatform.user.post_votes.users.at(
        connection,
        {
          postVoteId: validPostVoteId,
        },
      );
    },
  );
}
