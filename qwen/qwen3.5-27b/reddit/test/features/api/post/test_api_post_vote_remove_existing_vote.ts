import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the vote removal workflow where a member removes their existing vote from a post.
 * 1. Member authenticates and creates a community
 * 2. Member creates a post in the community
 * 3. Member casts an upvote (value: 1) on the post
 * 4. Verify the post score increased to 1
 * 5. Member removes their vote by sending value: 0
 * 6. Verify the post score decreased back to 0
 */
export async function test_api_post_vote_remove_existing_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  TestValidator.equals("initial post score is 0", post.score, 0);
  // 4. Cast an upvote (value: 1)
  const upvotedPost = await api.functional.redditClone.member.posts.vote(
    memberConnection,
    {
      postId: post.id,
      body: {
        value: 1,
      } satisfies IRedditClonePost.IVoteRequest,
    },
  );
  typia.assert(upvotedPost);
  // 5. Verify upvote was successful
  TestValidator.equals(
    "post score increased to 1 after upvote",
    upvotedPost.score,
    1,
  );
  // 6. Remove the vote by sending value: 0
  const removedVotePost = await api.functional.redditClone.member.posts.vote(
    memberConnection,
    {
      postId: post.id,
      body: {
        value: 0,
      } satisfies IRedditClonePost.IVoteRequest,
    },
  );
  typia.assert(removedVotePost);
  // 7. Verify vote removal was successful
  TestValidator.equals(
    "post score decreased back to 0 after vote removal",
    removedVotePost.score,
    0,
  );
}
