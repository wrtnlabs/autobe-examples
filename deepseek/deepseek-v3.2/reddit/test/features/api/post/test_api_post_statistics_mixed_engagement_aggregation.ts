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
import type { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
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
 * Test retrieving comprehensive statistics for a text post with mixed engagement to validate
 * statistical aggregation accuracy.
 *
 * Create a community, subscribe to it, create a text post with some voting activity,
 * then retrieve statistics. The test should verify that statistics include: total view
 * counts separated by member and guest actors, vote counts (upvotes, downvotes), vote
 * score (upvotes minus downvotes), and timestamps. Create two member accounts - one to
 * create the post and vote on it, another to view and vote. Also simulate guest views
 * by calling the endpoint without authentication. Verify that member views are tracked
 * separately from guest views. Check that vote metrics correctly aggregate from the
 * post_votes table and match expected counts. Validate that all statistical fields
 * are present and correctly calculated.
 */
export async function test_api_post_statistics_mixed_engagement_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member setup - post owner
  const postOwnerConnection: api.IConnection = { host: connection.host };
  const postOwner = await authorize_member_join(postOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(postOwner);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      postOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(12).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      postOwnerConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create text post
  const post = await generate_random_community_platform_member_posts_create(
    postOwnerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
            wordMin: 3,
            wordMax: 8,
          }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post);
  // 5. Simulate guest views (calling statistics endpoint without auth)
  // Base connection has no auth headers, simulating guest access
  await api.functional.communityPlatform.posts.statistics(connection, {
    postId: post.id,
    body: {
      actor_type: "guest",
    } satisfies ICommunityPlatformPostViewStat.IRequest,
  });
  // 6. Second member setup - engagement generator
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondMember);
  // 7. Second member subscribes to community
  await generate_random_community_platform_member_subscriptions_create(
    secondMemberConnection,
    {
      body: {
        community_id: community.id,
        active: true,
      },
    },
  );
  // 8. Second member creates votes
  const upvote =
    await generate_random_community_platform_member_posts_votes_create(
      secondMemberConnection,
      {
        params: { postId: post.id },
        body: { type: "up" },
      },
    );
  typia.assert(upvote);
  // 9. First member also votes on their own post
  const downvote =
    await generate_random_community_platform_member_posts_votes_create(
      postOwnerConnection,
      {
        params: { postId: post.id },
        body: { type: "down" },
      },
    );
  typia.assert(downvote);
  // 10. Retrieve statistics with filtering
  const memberStats = await api.functional.communityPlatform.posts.statistics(
    postOwnerConnection,
    {
      postId: post.id,
      body: {
        actor_type: "member",
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(memberStats);
  const guestStats = await api.functional.communityPlatform.posts.statistics(
    connection, // Base connection without auth for guest
    {
      postId: post.id,
      body: {
        actor_type: "guest",
      } satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(guestStats);
  const allStats = await api.functional.communityPlatform.posts.statistics(
    postOwnerConnection,
    {
      postId: post.id,
      body: {} satisfies ICommunityPlatformPostViewStat.IRequest,
    },
  );
  typia.assert(allStats);
  // 11. Validate statistical aggregation
  // Verify actor type separation
  TestValidator.equals(
    "member stats actor type",
    memberStats.actor_type,
    "member",
  );
  TestValidator.equals(
    "guest stats actor type",
    guestStats.actor_type,
    "guest",
  );
  // Verify post reference
  TestValidator.equals("member stats post id", memberStats.post.id, post.id);
  TestValidator.equals("guest stats post id", guestStats.post.id, post.id);
  TestValidator.equals("all stats post id", allStats.post.id, post.id);
  // Verify view counts are non-negative
  TestValidator.predicate(
    "member view count non-negative",
    memberStats.view_count >= 0,
  );
  TestValidator.predicate(
    "guest view count non-negative",
    guestStats.view_count >= 0,
  );
  TestValidator.predicate(
    "all stats view count non-negative",
    allStats.view_count >= 0,
  );
  TestValidator.predicate(
    "member unique viewer count non-negative",
    memberStats.unique_viewer_count >= 0,
  );
  TestValidator.predicate(
    "guest unique viewer count non-negative",
    guestStats.unique_viewer_count >= 0,
  );
  TestValidator.predicate(
    "all stats unique viewer count non-negative",
    allStats.unique_viewer_count >= 0,
  );
  // Verify timestamps are valid ISO strings
  TestValidator.predicate(
    "member stats created_at valid",
    () => new Date(memberStats.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "member stats updated_at valid",
    () => new Date(memberStats.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "guest stats created_at valid",
    () => new Date(guestStats.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "guest stats updated_at valid",
    () => new Date(guestStats.updated_at).toString() !== "Invalid Date",
  );
  // Verify all required fields are present
  typia.assert<ICommunityPlatformPostViewStat>(memberStats);
  typia.assert<ICommunityPlatformPostViewStat>(guestStats);
  typia.assert<ICommunityPlatformPostViewStat>(allStats);
  // Verify statistical consistency
  // Total view counts should be at least the sum of member and guest views
  TestValidator.predicate(
    "total views at least member + guest",
    allStats.view_count >= memberStats.view_count + guestStats.view_count,
  );
}
