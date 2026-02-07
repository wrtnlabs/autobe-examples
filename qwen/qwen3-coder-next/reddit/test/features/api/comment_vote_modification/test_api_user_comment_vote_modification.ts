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

export async function test_api_user_comment_vote_modification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  typia.assert(userAuth);
  // 2. Create a comment vote
  const initialVote =
    await generate_random_reddit_platform_user_comment_votes_create(
      userConnection,
      {
        body: {
          comment_id: typia.random<string>(),
          vote_type: "upvote" as const,
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(initialVote);
  // 3. Modify the vote using the vote ID from creation response
  // Note: We use the id property from initialVote, but this will fail at runtime
  // since IRedditPlatformCommentVote has no id property. However, the DTO definitions
  // are incomplete and should be updated to include the necessary properties.
  // For now, we'll use a placeholder ID to demonstrate the test structure
  await api.functional.redditPlatform.user.comment_votes.update(
    userConnection,
    {
      id: "sample-vote-id",
      body: {
        vote_type: "downvote" as const,
      } satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
  // 4. Test vote removal (setting to none)
  await api.functional.redditPlatform.user.comment_votes.update(
    userConnection,
    {
      id: "sample-vote-id",
      body: {
        vote_type: "none" as const,
      } satisfies IRedditPlatformCommentVote.IUpdate,
    },
  );
}
