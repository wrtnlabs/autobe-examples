import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformDiscoveryFeedSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryFeedSection";
import type { ICommunityPlatformDiscoveryHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryHomeFeed";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryHomeFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryHomeFeed";

/**
 * Validate that a freshly joined member user with at least one active community
 * subscription can retrieve a structurally valid personalized home discovery
 * feed.
 *
 * Business flow:
 *
 * 1. Join as a new memberUser via auth.memberUser.join and obtain an authenticated
 *    session (token handled by SDK).
 * 2. Create a community with reasonable configuration flags.
 * 3. Subscribe the member user to that community (active, notifications on).
 * 4. Call the home discovery feed endpoint with page=1, limit=20, sortMode="hot"
 *    and no additional filters.
 * 5. Assert pagination metadata matches the request and that the feed data
 *    structure matches IPageICommunityPlatformDiscoveryHomeFeed.ISummary with
 *    discovery sections and items well-typed.
 *
 * This test does not enforce specific section or item counts; it only requires
 * that the endpoint responds successfully under an authenticated context and
 * returns a well-formed, type-safe payload.
 */
export async function test_api_discovery_home_feed_basic_personalized_flow(
  connection: api.IConnection,
) {
  // 1. Join as a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new community as this member user
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MinLength<1> & tags.MaxLength<255>,
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }) as string & tags.MaxLength<4000>,
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 3. Subscribe to the community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals("subscription is active", subscription.is_active, true);
  TestValidator.equals(
    "subscription receive_notifications is true",
    subscription.receive_notifications,
    true,
  );

  // 4. Request the home discovery feed with minimal valid request
  const homeRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sortMode: "hot" as const,
  } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;

  const page: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
      connection,
      { body: homeRequestBody },
    );
  typia.assert(page);

  // 5. Validate pagination metadata
  const pagination: IPage.IPagination = page.pagination;
  TestValidator.equals("pagination current page is 1", pagination.current, 1);
  TestValidator.equals("pagination limit is 20", pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );

  // 6. Validate feed data structure
  const summaries: ICommunityPlatformDiscoveryHomeFeed.ISummary[] = page.data;
  TestValidator.predicate(
    "data is an array (length >= 0)",
    Array.isArray(summaries) && summaries.length >= 0,
  );

  await ArrayUtil.asyncForEach(summaries, async (summary, index) => {
    typia.assert<ICommunityPlatformDiscoveryHomeFeed.ISummary>(summary);

    const sections: ICommunityPlatformDiscoveryFeedSection.ISummary[] =
      summary.sections;

    TestValidator.predicate(
      `sections is defined for summary index ${index}`,
      Array.isArray(sections),
    );

    await ArrayUtil.asyncForEach(sections, async (section, sectionIndex) => {
      typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(section);

      const items: ICommunityPlatformDiscoveryItem.ISummary[] = section.items;

      TestValidator.predicate(
        `items array is defined for section ${sectionIndex} of summary ${index}`,
        Array.isArray(items),
      );

      await ArrayUtil.asyncForEach(items, async (item) => {
        typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(item);
      });
    });
  });
}
