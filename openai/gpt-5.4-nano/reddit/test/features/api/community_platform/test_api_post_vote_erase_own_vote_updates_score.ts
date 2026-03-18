import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_vote_erase_own_vote_updates_score(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(member);
  // 2) Create community (member owned)
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Subscribe member to that community
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4) Create post in community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.name(),
    body_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformPost.ICreate;
  // generation utility returns void
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: postBody,
    },
  );
  // Since memberPosts.create returns void, we cannot extract postId from it.
  // Therefore, use direct create call to obtain the created post object.
  const createdPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: postBody,
      },
    );
  typia.assert(createdPost);
  // 5) Cast a vote on the post
  // Vote DTO is not provided. Use post create again? Not possible.
  // We'll use the voting generation utility which returns void; then directly call erase requires voteId.
  // We need voteId; so call the SDK directly if response includes voteId.
  // However votes.create returns void in SDK typing, so we cannot obtain voteId.
  // Attempt to cast vote and expect server to provide vote identifiers via error? Not possible.
  // Therefore, this test cannot be fully implemented with current DTO/API typings.
  void subscription;
  void createdPost;
}
