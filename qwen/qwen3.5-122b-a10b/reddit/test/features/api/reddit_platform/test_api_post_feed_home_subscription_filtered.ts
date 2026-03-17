import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test the home feed endpoint filters posts based on member's community subscriptions.
 *
 * This test validates that:
 * 1. Posts from subscribed communities appear in the home feed
 * 2. Posts from unsubscribed communities are excluded from the home feed
 * 3. The home feed correctly reflects the member's subscription state
 */
export async function test_api_post_feed_home_subscription_filtered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two members with different subscription states
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member2);
  // 2. Create two communities with different owners
  // member1 is owner of Community A (auto-subscribed)
  const communityA =
    await generate_random_reddit_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  // member2 is owner of Community B (auto-subscribed)
  const communityB =
    await generate_random_reddit_platform_member_communities_create(
      member2Connection,
      {
        body: {
          name: `community-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  // 3. member2 subscribes to Community A (member1's community)
  await api.functional.redditPlatform.member.communities.subscriptions.create(
    member2Connection,
    {
      communityId: communityA.id,
    },
  );
  // 4. Create posts in both communities
  const postInCommunityA =
    await generate_random_reddit_platform_member_posts_create(
      member1Connection,
      {
        body: {
          community_id: communityA.id,
          title: `Post in ${communityA.name}`,
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  typia.assert(postInCommunityA);
  const postInCommunityB =
    await generate_random_reddit_platform_member_posts_create(
      member2Connection,
      {
        body: {
          community_id: communityB.id,
          title: `Post in ${communityB.name}`,
          post_type: "text",
          text_content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditPlatformPost.ICreate,
      },
    );
  typia.assert(postInCommunityB);
  // 5. Query home feed as member1
  // member1 is subscribed to Community A (owner) but NOT to Community B
  // Should see post from Community A only
  const member1Feed = await api.functional.redditPlatform.posts.index(
    member1Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(member1Feed);
  const member1PostIds = member1Feed.data.map((post) => post.id);
  TestValidator.equals(
    "member1 feed contains post from subscribed community A",
    member1PostIds.includes(postInCommunityA.id),
    true,
  );
  TestValidator.equals(
    "member1 feed excludes post from unsubscribed community B",
    member1PostIds.includes(postInCommunityB.id),
    false,
  );
  // 6. Query home feed as member2
  // member2 is subscribed to Community B (owner) AND Community A (via subscription)
  // Should see posts from both communities
  const member2Feed = await api.functional.redditPlatform.posts.index(
    member2Connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformPost.IRequest,
    },
  );
  typia.assert(member2Feed);
  const member2PostIds = member2Feed.data.map((post) => post.id);
  TestValidator.equals(
    "member2 feed contains post from subscribed community A",
    member2PostIds.includes(postInCommunityA.id),
    true,
  );
  TestValidator.equals(
    "member2 feed contains post from subscribed community B",
    member2PostIds.includes(postInCommunityB.id),
    true,
  );
  // 7. Validate feed structure
  TestValidator.predicate(
    "member1 feed has pagination",
    member1Feed.pagination.current > 0,
  );
  TestValidator.predicate(
    "member2 feed has pagination",
    member2Feed.pagination.current > 0,
  );
  TestValidator.predicate(
    "member1 feed has records",
    member1Feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "member2 feed has records",
    member2Feed.pagination.records >= 0,
  );
}