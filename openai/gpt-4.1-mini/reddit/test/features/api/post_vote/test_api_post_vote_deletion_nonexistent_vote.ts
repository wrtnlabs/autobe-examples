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

export async function test_api_post_vote_deletion_nonexistent_vote(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Deletion attempt of a non-existent post vote.
  //
  // 1. Register a new user to obtain authenticated user session.
  // 2. Attempt to delete a post vote with a random UUID that does not exist.
  // 3. Confirm that the API responds with HTTP 404 Not Found error.
  // Step 1. Create a user connection and register the user.
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  userConnection.headers = { Authorization: authorized.token.access };
  // Step 2. Attempt to delete a non-existent post vote by random UUID.
  const randomPostVoteId = typia.random<string & tags.Format<"uuid">>();
  // Step 3. Expect an HTTP 404 Not Found error.
  await TestValidator.httpError(
    "delete non-existent post vote returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.post_votes.erasePostVote(
        userConnection,
        {
          postVoteId: randomPostVoteId,
        },
      );
    },
  );
}
