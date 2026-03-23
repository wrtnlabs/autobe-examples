import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test vote modification scenario where a user changes their vote from upvote to downvote.
 *
 * This test validates the vote direction change functionality by:
 * 1. Setting up two members (voter and author)
 * 2. Creating a community, post, and comment
 * 3. Voter upvotes the comment first
 * 4. Voter changes vote to downvote
 * 5. Validates the score delta calculation (-2) and karma change
 */
export async function test_api_comment_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate voter member
  const voterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(voterConnection, {});
  // 2. Register and authenticate comment author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorResult = await authorize_member_join(authorConnection, {});
  typia.assert(authorResult);
  // 3. Author creates a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 4. Author creates a post in their community
  const post = await generate_random_reddit_clone_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 5. Author creates a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // Record initial author karma (should be 0)
  const initialAuthorKarma = authorResult.karma;
  TestValidator.equals("initial author karma is 0", initialAuthorKarma, 0);
  // 6. Voter first upvotes the comment (value=1)
  const upvoteResult =
    await api.functional.redditClone.member.posts.comments.vote(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { value: 1 },
      },
    );
  typia.assert(upvoteResult);
  // Validate upvote result
  TestValidator.equals("upvote voteValue is 1", upvoteResult.voteValue, 1);
  TestValidator.equals(
    "upvote commentScore is 1",
    upvoteResult.commentScore,
    1,
  );
  TestValidator.equals("upvote karmaChange is 1", upvoteResult.karmaChange, 1);
  // 7. Voter changes their vote to downvote (value=-1)
  const downvoteResult =
    await api.functional.redditClone.member.posts.comments.vote(
      voterConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { value: -1 },
      },
    );
  typia.assert(downvoteResult);
  // 8. Validate downvote result
  TestValidator.equals(
    "downvote voteValue is -1",
    downvoteResult.voteValue,
    -1,
  );
  TestValidator.equals(
    "downvote commentScore is -1",
    downvoteResult.commentScore,
    -1,
  );
  TestValidator.equals(
    "downvote karmaChange is -2 (delta from 1 to -1)",
    downvoteResult.karmaChange,
    -2,
  );
  // Validate that comment author is correct
  TestValidator.equals(
    "comment author matches",
    downvoteResult.commentAuthor.id,
    authorResult.id,
  );
  // Validate score delta calculation: new_value(-1) - old_value(1) = -2
  TestValidator.predicate(
    "score delta is correct (-1 - 1 = -2)",
    downvoteResult.karmaChange === -2,
  );
}