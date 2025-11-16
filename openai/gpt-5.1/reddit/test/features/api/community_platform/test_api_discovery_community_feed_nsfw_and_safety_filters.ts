import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformDiscoveryCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryCommunityFeed";
import type { ICommunityPlatformDiscoveryFeedSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryFeedSection";
import type { ICommunityPlatformDiscoveryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDiscoveryItem";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDiscoveryCommunityFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDiscoveryCommunityFeed";

/**
 * Validate NSFW and safetyLevel filter combinations on the community-scoped
 * discovery feed.
 *
 * Business flow:
 *
 * 1. Join as a new memberUser to obtain an authenticated context.
 * 2. Create a dedicated NSFW community with permissive posting configuration.
 * 3. Request the community discovery feed with nsfwFilter="exclude" and
 *    safetyLevel="strict".
 * 4. Request the same feed with nsfwFilter="include"/"standard" and
 *    "only"/"relaxed".
 * 5. When content exists, optionally verify that exclude vs only produce different
 *    item sets.
 * 6. Verify that unauthenticated callers cannot access the community discovery
 *    feed.
 */
export async function test_api_discovery_community_feed_nsfw_and_safety_filters(
  connection: api.IConnection,
) {
  // 1. Join as a new member user to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create an NSFW community with permissive posting configuration
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    visibility: "public",
    status: "active",
    is_nsfw: true,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Common pagination parameters for feed requests
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  // 3. NSFW exclude + strict safety
  const excludeStrictBody = {
    page,
    limit,
    sortMode: "hot",
    nsfwFilter: "exclude",
    safetyLevel: "strict",
  } satisfies ICommunityPlatformDiscoveryCommunityFeed.IRequest;

  const excludeStrictPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: excludeStrictBody,
      },
    );
  typia.assert(excludeStrictPage);

  TestValidator.equals(
    "exclude/strict pagination current page matches request",
    excludeStrictPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "exclude/strict pagination limit matches request",
    excludeStrictPage.pagination.limit,
    limit,
  );

  // 4a. NSFW include + standard safety
  const includeStandardBody = {
    page,
    limit,
    sortMode: "hot",
    nsfwFilter: "include",
    safetyLevel: "standard",
  } satisfies ICommunityPlatformDiscoveryCommunityFeed.IRequest;

  const includeStandardPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: includeStandardBody,
      },
    );
  typia.assert(includeStandardPage);

  TestValidator.equals(
    "include/standard pagination current page matches request",
    includeStandardPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "include/standard pagination limit matches request",
    includeStandardPage.pagination.limit,
    limit,
  );

  // 4b. NSFW only + relaxed safety
  const onlyRelaxedBody = {
    page,
    limit,
    sortMode: "hot",
    nsfwFilter: "only",
    safetyLevel: "relaxed",
  } satisfies ICommunityPlatformDiscoveryCommunityFeed.IRequest;

  const onlyRelaxedPage: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: onlyRelaxedBody,
      },
    );
  typia.assert(onlyRelaxedPage);

  TestValidator.equals(
    "only/relaxed pagination current page matches request",
    onlyRelaxedPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "only/relaxed pagination limit matches request",
    onlyRelaxedPage.pagination.limit,
    limit,
  );

  // 5. Optionally compare item sets between exclude and only when both have items
  const excludeSections = excludeStrictPage.data[0]?.sections ?? [];
  const onlySections = onlyRelaxedPage.data[0]?.sections ?? [];

  if (
    excludeSections.length > 0 &&
    onlySections.length > 0 &&
    excludeSections[0].items.length > 0 &&
    onlySections[0].items.length > 0
  ) {
    const excludeIds = excludeSections[0].items.map((i) => i.id);
    const onlyIds = onlySections[0].items.map((i) => i.id);

    TestValidator.notEquals(
      "NSFW exclude vs only should yield different first-section item id sets when content exists",
      excludeIds,
      onlyIds,
    );
  }

  // 6. Verify unauthenticated callers cannot access community feed
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot access community discovery feed",
    async () => {
      await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
        unauthenticatedConnection,
        {
          communityId: community.id,
          body: excludeStrictBody,
        },
      );
    },
  );
}
