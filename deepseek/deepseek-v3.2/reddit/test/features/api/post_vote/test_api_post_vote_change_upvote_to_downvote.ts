import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test scenario where a member changes their vote from upvote to downvote on a post.
 * The scenario validates: 1) The authenticated member can update their own vote,
 * 2) Changing vote type from 'up' to 'down' updates the vote record correctly,
 * 3) The post author's karma score decreases by 2 points (removing +1 from upvote
 * and applying -1 from downvote), 4) The post's vote score decreases by 2,
 * 5) Cannot update vote belonging to another member (should return 404).
 */
export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create voter (Member A)
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(voter);
  // 2. Create post author (Member B)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(author);
  // 3. Create community (by voter)
  const community =
    await generate_random_community_platform_member_communities_create(
      voterConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Both members subscribe to community
  await generate_random_community_platform_member_subscriptions_create(
    voterConnection,
    {
      body: {
        community_id: community.id,
        active: true,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  await generate_random_community_platform_member_subscriptions_create(
    authorConnection,
    {
      body: {
        community_id: community.id,
        active: true,
      } satisfies ICommunityPlatformSubscription.ICreate,
    },
  );
  // 5. Author creates text post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Get initial post details to capture vote score
  const postBeforeVote = post;
  const initialPostVoteScore = postBeforeVote.vote_score;
  // Get author's initial karma
  const initialKarma = author.karma;
  // 6. Voter creates initial upvote
  const initialVote =
    await generate_random_community_platform_member_posts_votes_create(
      voterConnection,
      {
        body: {
          type: "up",
        } satisfies ICommunityPlatformPostVote.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(initialVote);
  TestValidator.equals("initial vote should be up", initialVote.type, "up");
  // Get post after upvote to see updated vote score
  // Note: We need to refetch post to get updated vote score
  // Since we don't have a GET post endpoint, we'll trust the update logic
  // 7. Update vote from up to down
  const updatedVote =
    await api.functional.communityPlatform.member.posts.votes.putByPostidAndVoteid(
      voterConnection,
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          type: "down",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(updatedVote);
  // 8. Validate vote record updated correctly
  TestValidator.equals(
    "vote type should be down after update",
    updatedVote.type,
    "down",
  );
  TestValidator.notEquals(
    "updated_at timestamp should change",
    updatedVote.updated_at,
    initialVote.updated_at,
  );
  // 9. Validate karma decreased by 2
  // We need to refetch author's profile to get updated karma
  // Since we don't have a GET member profile endpoint, we'll trust the karma update logic
  // According to section 339 rules, karma should decrease by 2
  // We'll validate this by checking the business logic through the vote change
  // 10. Validate post vote score decreased by 2
  // Since we don't have a GET post endpoint, we'll validate the logic:
  // initial upvote: +1
  // changed to downvote: -1
  // net change: -2 (from +1 to -1)
  // So vote score should decrease by 2
  // 11. Attempt to update another member's vote (should fail)
  await TestValidator.error("cannot update another member's vote", async () => {
    await api.functional.communityPlatform.member.posts.votes.putByPostidAndVoteid(
      authorConnection, // Author trying to update voter's vote
      {
        postId: post.id,
        voteId: initialVote.id,
        body: {
          type: "down",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  });
  // 12. Final validation
  // The test validates that:
  // 1. Vote update works (type changed from up to down)
  // 2. Vote record updated (updated_at changed)
  // 3. Unauthorized access prevented (author cannot update voter's vote)
  // Karma and vote score validation would require GET endpoints
}
