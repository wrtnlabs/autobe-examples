import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

/**
 * Test retrieving a member's existing downvote on a post.
 *
 * Workflow:
 * 1. Authenticate as member by creating new account
 * 2. Create a community to post in
 * 3. Subscribe to the community before creating post
 * 4. Create a text post to vote on
 * 5. Cast a downvote on the post
 * 6. Retrieve the vote using GET /redditCommunity/member/posts/{postId}/vote
 * 7. Validate that the response contains the vote record with direction 'DOWNVOTE'
 *
 * This tests the symmetric behavior of vote retrieval for both vote directions.
 */
export async function test_api_post_vote_retrieve_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member by creating new account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community to post in
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community before creating post
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post to vote on
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast a downvote on the post
  const vote = await api.functional.redditCommunity.member.posts.vote.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        direction: "DOWNVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 6. Retrieve the vote using GET endpoint
  const retrievedVote =
    await api.functional.redditCommunity.member.posts.vote.at(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(retrievedVote);
  // 7. Validate the response - business logic validation only
  TestValidator.equals("vote id matches", retrievedVote.id, vote.id);
  TestValidator.equals(
    "vote direction is DOWNVOTE",
    retrievedVote.direction,
    "DOWNVOTE",
  );
}
