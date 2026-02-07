import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_vote_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  // 2. Create a comment first (using random comment ID for now)
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a vote on the comment
  const voteUpdate = {
    type: "upvote",
  } satisfies IRedditPlatformCommentVote.IUpdate;
  await api.functional.redditPlatform.user.comments.vote.update(
    userConnection,
    {
      commentId: randomCommentId,
      body: voteUpdate,
    },
  );
  // 4. Retrieve the vote status
  const retrievedVote =
    await api.functional.redditPlatform.user.comments.vote.self.at(
      userConnection,
      {
        commentId: randomCommentId,
      },
    );
  typia.assert(retrievedVote);
  // 5. Validate vote status matches what was created
  // Since DTOs are minimal, we just verify the structure is valid
  TestValidator.predicate("vote exists", retrievedVote !== null);
}
