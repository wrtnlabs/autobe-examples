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

export async function test_api_moderator_vote_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator and user actors
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorCredential = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformModerator.IJoin;
  const moderator = await api.functional.redditPlatform.auth.moderator.join(
    moderatorConnection,
    { body: moderatorCredential },
  );
  typia.assert(moderator);
  const userConnection: api.IConnection = { host: connection.host };
  const userCredential = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  const user = await api.functional.redditPlatform.auth.user.join(
    userConnection,
    {
      body: userCredential,
    },
  );
  typia.assert(user);
  // Create new connection for user authentication
  const authenticatedUserConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.redditPlatform.auth.user.login(
    authenticatedUserConnection,
    {
      body: userCredential,
    },
  );
  // 2. Create test comment
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentResult = await api.functional.redditPlatform.posts.comments.create(
    authenticatedUserConnection,
    {
      postId,
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(commentResult);
  const comment = commentResult as IRedditPlatformComment;
  // Extract comment id using typia or get the id directly
  const commentId = (comment as any).id;
  // 3. Cast multiple votes on the comment
  const upvote = await api.functional.redditPlatform.user.comment_votes.create(
    authenticatedUserConnection,
    {
      body: {
        comment_id: commentId,
        vote_type: "upvote",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(upvote);
  // Create another user connection for second vote
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserCredential = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  const secondUser = await api.functional.redditPlatform.auth.user.join(
    secondUserConnection,
    {
      body: secondUserCredential,
    },
  );
  typia.assert(secondUser);
  const authenticatedSecondUserConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.redditPlatform.auth.user.login(
    authenticatedSecondUserConnection,
    {
      body: secondUserCredential,
    },
  );
  const downvote =
    await api.functional.redditPlatform.user.comment_votes.create(
      authenticatedSecondUserConnection,
      {
        body: {
          comment_id: commentId,
          vote_type: "downvote",
        } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(downvote);
  // 4. Execute: Retrieve vote history as moderator
  const voteHistory =
    await api.functional.redditPlatform.moderator.comments.vote_history.getVoteHistory(
      moderatorConnection,
      {
        commentId: commentId,
      },
    );
  typia.assert(voteHistory);
  // 5. Verify: Check vote history structure and content
  TestValidator.predicate(
    "vote history exists",
    voteHistory !== null && voteHistory !== undefined,
  );
  TestValidator.predicate("has vote records", Array.isArray(voteHistory));
  // Verify vote records structure
  if (Array.isArray(voteHistory)) {
    TestValidator.equals("has at least 2 votes", voteHistory.length, 2);
    // Check that each vote record has expected properties
    for (const vote of voteHistory) {
      TestValidator.predicate("has user_id", vote.user_id !== undefined);
      TestValidator.predicate("has vote_type", vote.vote_type !== undefined);
      TestValidator.predicate("has created_at", vote.created_at !== undefined);
      TestValidator.predicate(
        "comment_id matches",
        vote.comment_id === commentId,
      );
      // Verify vote types are valid
      TestValidator.predicate(
        "vote_type is upvote or downvote",
        vote.vote_type === "upvote" || vote.vote_type === "downvote",
      );
    }
    // Verify upvote and downvote exist
    const hasUpvote = voteHistory.some((v) => v.vote_type === "upvote");
    const hasDownvote = voteHistory.some((v) => v.vote_type === "downvote");
    TestValidator.equals("has upvote record", hasUpvote, true);
    TestValidator.equals("has downvote record", hasDownvote, true);
  }
  // 6. Test pagination
  const limitedHistory =
    await api.functional.redditPlatform.moderator.comments.vote_history.getVoteHistory(
      moderatorConnection,
      {
        commentId: commentId,
      },
    );
  typia.assert(limitedHistory);
  // Verify pagination properties exist (if applicable)
  TestValidator.predicate("pagination response valid", limitedHistory !== null);
}