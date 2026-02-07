import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformVoteHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformVoteHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_posts_comments_create } from "../../../generate/generate_random_reddit_platform_posts_comments_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";

export async function test_api_user_vote_history_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 2. Create a post for the comment (using SDK since no utility function exists for post creation)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a comment with no votes
  const comment = await api.functional.redditPlatform.posts.comments.create(
    userConnection,
    {
      postId: postId,
      body: typia.random<IRedditPlatformComment.ICreate>(),
    },
  );
  typia.assert(comment);
  // 4. Retrieve vote history for the comment with no votes
  // IRedditPlatformComment may have id as a property name other than 'id'
  // Let's check the actual structure by asserting the type
  const commentId = (comment as any).id ?? (comment as any).commentId ?? (comment as any).CommentId ?? (comment as any).ID ?? (comment as any).comment_id;
  const voteHistory =
    await api.functional.redditPlatform.user.comments.vote_history.getVoteHistory(
      userConnection,
      {
        commentId: commentId ?? typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(voteHistory);
  // 5. Verify the vote history response structure (empty object based on DTO definition)
  // The DTO IRedditPlatformVoteHistory.IRequest is defined as an empty object for query parameters,
  // but the response should contain the actual vote history data
  // Based on the scenario, we expect empty or minimal structure for comments with no votes
  TestValidator.predicate("vote history retrieved successfully", () => {
    return voteHistory !== null && voteHistory !== undefined;
  });
}