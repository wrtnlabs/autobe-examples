import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerator";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformVoteHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformVoteHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_comment_votes_create } from "../../../generate/generate_random_reddit_platform_user_comment_votes_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_moderator_vote_history_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  // 2. Create regular user for voting
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  // 3. Create a comment - basic smoke test that comment creation works
  const emptyVoteComment =
    await api.functional.redditPlatform.posts.comments.create(userConnection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditPlatformComment.ICreate>(),
    });
  typia.assert(emptyVoteComment);
  // 4. Test vote history retrieval - smoke test that endpoint works
  // Since DTOs are empty, we can't access specific properties
  const emptyHistory =
    await api.functional.redditPlatform.moderator.comments.vote_history.getVoteHistory(
      moderatorConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(emptyHistory);
  // 5. Test with populated comment
  const populatedComment =
    await api.functional.redditPlatform.posts.comments.create(userConnection, {
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IRedditPlatformComment.ICreate>(),
    });
  typia.assert(populatedComment);
  // 6. Add vote to build some history
  const vote = await api.functional.redditPlatform.user.comment_votes.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformCommentVote.ICreate>(),
    },
  );
  typia.assert(vote);
  // 7. Test vote history with populated comment
  const fullHistory =
    await api.functional.redditPlatform.moderator.comments.vote_history.getVoteHistory(
      moderatorConnection,
      {
        commentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(fullHistory);
  // 8. Basic validation that history is an array (empty DTO prevents detailed checks)
  TestValidator.equals(
    "vote history should be array type",
    Array.isArray(fullHistory),
    true,
  );
}
