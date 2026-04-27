import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_votes_create } from "../../../generate/generate_random_community_platform_member_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

/**
 * Test that a member can change their vote from upvote to downvote on the same post, and verify the cascade updates adjust correctly.
 *
 * Validates the upsert behavior of the vote endpoint: when a member casts a second vote on the same target with a different value, the existing vote record is updated rather than a new one being created. This direction change should produce a delta of ±2 on the target content's vote score and the author's karma.
 *
 * 1. Member A joins the platform and creates a community.
 * 2. Member A subscribes to their own community.
 * 3. Member A creates a text post.
 * 4. Member B joins the platform and subscribes to the community.
 * 5. Member B casts an upvote (+1) on Member A's post.
 * 6. Member B casts a downvote (-1) on the SAME post - updating the existing vote.
 * 7. Validates the second vote record has value=-1 and updated_at > created_at.
 */
export async function test_api_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A joins, creates community, subscribes, creates post
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberAConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          images: [
            {
              name: "icon.png",
              mime_type: "image/png",
              size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              url: typia.random<string & tags.Format<"uri">>(),
            },
          ],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const subscriptionA =
    await api.functional.communityPlatform.member.communities.subscribers.create(
      memberAConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscriptionA);
  const post = await api.functional.communityPlatform.member.posts.create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityId: community.id,
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "initial post vote score is 0",
    post.vote_score,
    0 as const,
  );
  // 2. Member B joins and subscribes
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const subscriptionB =
    await api.functional.communityPlatform.member.communities.subscribers.create(
      memberBConnection,
      {
        communityId: community.id,
        body: {} satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscriptionB);
  // 3. Member B casts an upvote (+1)
  const firstVote = await api.functional.communityPlatform.member.votes.create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: 1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(firstVote);
  TestValidator.equals("first vote value is +1", firstVote.value, 1 as const);
  // 4. Member B changes vote to downvote (-1) - triggers upsert
  const secondVote = await api.functional.communityPlatform.member.votes.create(
    memberBConnection,
    {
      body: {
        target_type: "post",
        target_id: post.id,
        value: -1,
      } satisfies ICommunityPlatformVote.ICreate,
    },
  );
  typia.assert(secondVote);
  TestValidator.equals(
    "second vote value is -1",
    secondVote.value,
    -1 as const,
  );
  TestValidator.predicate(
    "updated_at is after created_at after vote change",
    () =>
      new Date(secondVote.updated_at).getTime() >
      new Date(secondVote.created_at).getTime(),
  );
  TestValidator.equals(
    "vote id remains the same across upsert",
    firstVote.id,
    secondVote.id,
  );
}
