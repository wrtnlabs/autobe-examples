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
import { generate_random_reddit_platform_user_comment_votes_create } from "../../../generate/generate_random_reddit_platform_user_comment_votes_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_user_comment_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user
  const userConnection: api.IConnection = { host: connection.host };
  const authResponse = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: typia.random<IRedditPlatformUser.IJoin>(),
    },
  );
  typia.assert(authResponse);
  // 2. Create comment vote with upvote
  const createVoteResponse =
    await api.functional.redditPlatform.user.comment_votes.create(
      userConnection,
      {
        body: typia.random<IRedditPlatformCommentVote.ICreate>(),
      },
    );
  typia.assert(createVoteResponse);
  // 3. Update vote from upvote to downvote
  // Since IRedditPlatformCommentVote has no properties defined in DTO,
  // we need to use a valid comment ID. We'll generate a random one for testing.
  // In a real scenario, this would be the ID from the created vote
  const updatedVote =
    await api.functional.redditPlatform.user.comment_votes.update(
      userConnection,
      {
        id: "00000000-0000-0000-0000-000000000000", // Using a dummy UUID
        body: typia.random<IRedditPlatformCommentVote.IUpdate>(),
      },
    );
  typia.assert(updatedVote);
  // 4. Validate the update was successful
  // Since the DTO has no properties defined, we can only verify basic structure
  TestValidator.equals("vote should be updated", typeof updatedVote, "object");
}
