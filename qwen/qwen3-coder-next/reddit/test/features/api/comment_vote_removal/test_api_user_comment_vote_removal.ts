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

export async function test_api_user_comment_vote_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user account
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "123456",
      username: RandomGenerator.name(2),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(registeredUser);
  // 2. Create a comment vote
  const vote = await generate_random_reddit_platform_user_comment_votes_create(
    userConnection,
    {
      body: {
        comment_id: typia.random<string & tags.Format<"uuid">>(),
        type: "upvote" as const,
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote);
  // 3. Remove the vote by updating type to 'none'
  // Since IRedditPlatformCommentVote has no properties, we can't access vote.id
  // Using a placeholder ID since the DTO definition is incomplete
  const updatedVote =
    await api.functional.redditPlatform.user.comment_votes.update(
      userConnection,
      {
        id: "placeholder-id" as string,
        body: {
          type: "none" as const,
        } satisfies IRedditPlatformCommentVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 4. Validation - since the DTO has no properties, we can only validate the types
  // No specific property validation possible with empty DTO
}
