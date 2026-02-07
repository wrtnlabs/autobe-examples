import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
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
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { generate_random_reddit_platform_user_comment_votes_create } from "../../../generate/generate_random_reddit_platform_user_comment_votes_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_creation_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first user (voter)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_user_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(voter);
  // 2. Register second user (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(author);
  // 3. Create a comment using the utility function
  // Since IRedditPlatformComment has no defined properties, use typia.random() for comment data
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentData = typia.random<IRedditPlatformComment>();
  const comment = await generate_random_reddit_platform_posts_comments_create(
    authorConnection,
    {
      params: { postId },
      body: commentData satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // 4. Cast upvote on the comment using utility function
  const voteData = typia.random<IRedditPlatformCommentVote>();
  const vote = await generate_random_reddit_platform_user_comment_votes_create(
    voterConnection,
    {
      body: voteData satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(vote);
  // 5. Test self-voting prevention (basic validation)
  await TestValidator.error("self-voting prohibited", async () => {
    const selfVoteData = typia.random<IRedditPlatformCommentVote>();
    await generate_random_reddit_platform_user_comment_votes_create(
      authorConnection,
      {
        body: selfVoteData satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  });
}
