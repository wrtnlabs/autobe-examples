import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import type { IRedditLikeCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { generate_random_reddit_like_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_like_community_member_posts_votes_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";
import { prepare_random_reddit_like_community_post_vote } from "../../../prepare/prepare_random_reddit_like_community_post_vote";

/**
 * Test member checking their downvote on a post returns the complete vote record.
 *
 * Validates the complete vote check workflow including member registration, community creation,
 * subscription establishment, post creation, and vote casting prior to verification.
 * Ensures that the GET check endpoint returns a vote record with direction='down'
 * when the authenticated member has previously cast a downvote on the specified post.
 *
 * The test verifies that the vote record correctly associates the voter identity through the
 * author field containing the authenticated member's summary, and links to the correct
 * post through the post field matching the created post summary. Timestamps are validated
 * as populated fields on the returned entity.
 *
 * 1. Authenticate as a new member via join utility.
 * 2. Create a community using the generation utility.
 * 3. Subscribe to the community using the subscription utility.
 * 4. Create a text post in the subscribed community.
 * 5. Cast a downvote on the created post.
 * 6. Call GET /redditLikeCommunity/member/votes/posts/{postId}/check with the postId of the downvoted post.
 * 7. Validate that the returned vote record has direction='down', author matches the member, post matches the created post, and timestamps are present.
 */
export async function test_api_post_vote_check_downvote_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_reddit_like_community_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Cast a downvote on the post
  const vote =
    await generate_random_reddit_like_community_member_posts_votes_create(
      memberConnection,
      {
        body: {
          direction: "down",
        } satisfies IRedditLikeCommunityPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(vote);
  // 6. Check the vote status
  const checkVote =
    await api.functional.redditLikeCommunity.member.votes.posts.check(
      memberConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(checkVote);
  // 7. Validate the vote record
  TestValidator.equals("vote direction is down", checkVote.direction, "down");
  TestValidator.equals(
    "vote author matches authenticated member",
    checkVote.author.id,
    member.id,
  );
  TestValidator.equals(
    "vote post matches created post",
    checkVote.post.id,
    post.id,
  );
}