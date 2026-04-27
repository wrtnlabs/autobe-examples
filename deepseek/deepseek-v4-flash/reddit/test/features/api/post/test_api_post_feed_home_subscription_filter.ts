import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test the home feed mode which filters posts to only communities the authenticated member is subscribed to.
 *
 * Validates the core home feed business logic: two members each create a community, subscribe to it, and create a post. When Member A views their home feed, only the post from Member A's subscribed community appears — the post from Member B's unsubscribed community is correctly excluded.
 *
 * 1. Member A joins, creates community A, subscribes to community A, and creates a text post in community A.
 * 2. Member B joins, creates community B, subscribes to community B, and creates a text post in community B.
 * 3. Member A calls PATCH /member/posts with feed='home'.
 * 4. Verifies pagination shows 1 record, the returned post belongs to community A, and community B's post is absent.
 */
export async function test_api_post_feed_home_subscription_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A setup
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const communityA =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(communityA);
  await generate_random_community_platform_member_communities_subscribers_create(
    memberAConnection,
    { params: { communityId: communityA.id } },
  );
  const postA = await generate_random_community_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        communityId: communityA.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(postA);
  // 2. Member B setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const communityB =
    await generate_random_community_platform_member_communities_create(
      memberBConnection,
      {},
    );
  typia.assert(communityB);
  await generate_random_community_platform_member_communities_subscribers_create(
    memberBConnection,
    { params: { communityId: communityB.id } },
  );
  const postB = await generate_random_community_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        communityId: communityB.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(postB);
  // 3. Member A views their home feed
  const feedPage = await api.functional.communityPlatform.member.posts.index(
    memberAConnection,
    {
      body: {
        feed: "home",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feedPage);
  // 4. Validations
  TestValidator.equals(
    "only one post in home feed",
    feedPage.pagination.records,
    1,
  );
  TestValidator.equals(
    "post belongs to community A",
    feedPage.data[0]!.community.id,
    communityA.id,
  );
  TestValidator.predicate(
    "community B post is excluded",
    feedPage.data.every((p) => p.community.id !== communityB.id),
  );
}
