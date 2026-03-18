import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_communities_subscriptions_create } from "../../../generate/generate_random_community_platform_member_communities_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_vote_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      username: RandomGenerator.alphabets(12),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatarImageUri: null,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(joined);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: { subscriptionStatus: "active" },
      },
    );
  typia.assert(subscription);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        contentType: "text",
        text: { body: true },
        link: null,
        image: null,
      },
    },
  );
  typia.assert(post);
  const upvoted =
    await api.functional.communityPlatform.member.posts.votes.processVote(
      memberConnection,
      {
        postId: post.id,
        body: {
          direction: 1,
        },
      },
    );
  typia.assert(upvoted);
  TestValidator.equals(
    "upvote member identity",
    upvoted.communityPlatformMemberId,
    joined.id,
  );
  TestValidator.equals("upvote direction", upvoted.direction, 1);
  TestValidator.equals("upvote active state", upvoted.deletedAt, null);
  const downvoted =
    await api.functional.communityPlatform.member.posts.votes.processVote(
      memberConnection,
      {
        postId: post.id,
        body: {
          direction: -1,
        },
      },
    );
  typia.assert(downvoted);
  TestValidator.equals(
    "downvote member identity",
    downvoted.communityPlatformMemberId,
    joined.id,
  );
  TestValidator.equals("downvote direction", downvoted.direction, -1);
  TestValidator.equals("downvote active state", downvoted.deletedAt, null);
  const cleared =
    await api.functional.communityPlatform.member.posts.votes.processVote(
      memberConnection,
      {
        postId: post.id,
        body: {
          direction: null,
        },
      },
    );
  typia.assert(cleared);
  TestValidator.equals(
    "cleared vote member identity",
    cleared.communityPlatformMemberId,
    joined.id,
  );
  TestValidator.equals("cleared vote removed state", cleared.deletedAt, null);
}
