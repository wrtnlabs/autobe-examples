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
 * Test first-time upvote on a post.
 * 1. Authenticate member via join
 * 2. Create a community
 * 3. Create a post in that community
 * 4. Upvote the post (value: 1)
 * 5. Verify post score increased from 0 to 1
 * 6. Verify author karma increased by 1
 */
export async function test_api_post_vote_upvote_first_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // Capture initial karma
  const initialKarma = member.karma;
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in that community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "text",
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // Capture initial post score (should be 0)
  const initialScore = post.score;
  // 4. Upvote the post (value: 1)
  const votedPost = await api.functional.redditClone.member.posts.vote(
    memberConnection,
    {
      postId: post.id,
      body: { value: 1 } satisfies IRedditClonePost.IVoteRequest,
    },
  );
  typia.assert(votedPost);
  // 5. Verify post score increased from 0 to 1
  TestValidator.equals(
    "post score increased by 1",
    votedPost.score,
    initialScore + 1,
  );
  // 6. Verify author karma increased by 1
  TestValidator.equals(
    "author karma increased by 1",
    votedPost.author.karma,
    initialKarma + 1,
  );
  // 7. Verify response contains updated post with new score
  TestValidator.predicate("voted post score is positive", votedPost.score > 0);
}
