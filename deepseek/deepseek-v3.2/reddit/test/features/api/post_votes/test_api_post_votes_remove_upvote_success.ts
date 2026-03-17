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

export async function test_api_post_votes_remove_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Record initial karma of post author (which is the member)
  const initialKarma = member.karma;
  // 5. Cast an upvote on the post
  const vote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { type: "up" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(vote);
  // Verify vote was created as upvote
  TestValidator.equals("vote type should be up", vote.type, "up");
  // Fetch post after vote to check vote score
  // Note: need to find a way to fetch the post again, but post fetch endpoint not available.
  // We'll rely on karma change and later vote removal.
  // 6. Delete the vote using the DELETE endpoint
  await api.functional.communityPlatform.member.post_votes.mine.erase(
    memberConnection,
    {
      postId: post.id,
    },
  );
  // DELETE returns 204 No Content (void), so no response to assert
  // 7. Verify the post author's karma decreases by 1 (since upvote removed)
  // Need to fetch member again to get updated karma
  // Since there's no member fetch endpoint, we cannot verify karma change directly.
  // This is a limitation; scenario says verify but API not available.
  // We'll skip karma verification and focus on other checks.
  // 8. Attempting to fetch the deleted vote returns 404
  // There is no fetch vote endpoint, so cannot verify 404.
  // 9. Ensure member can vote again on the same post
  const newVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { type: "down" } satisfies ICommunityPlatformPostVote.ICreate,
      },
    );
  typia.assert(newVote);
  TestValidator.equals("new vote type should be down", newVote.type, "down");
  TestValidator.notEquals("new vote id should differ", vote.id, newVote.id);
}
