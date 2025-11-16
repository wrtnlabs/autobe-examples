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
 * Verify NSFW and safetyLevel filters on the home discovery feed.
 *
 * Business goal
 *
 * - Ensure that an authenticated member user can call the home discovery feed
 *   endpoint with different nsfwFilter and safetyLevel combinations and that
 *   the backend accepts them and returns a well-formed, paginated feed
 *   response.
 * - Provide a realistic setup where the user is subscribed to at least one NSFW
 *   community so that NSFW-specific filters are meaningful, while not depending
 *   on any particular post content.
 *
 * Steps
 *
 * 1. Register a new member user using /auth/memberUser/join and let the SDK attach
 *    the access token to the connection.
 * 2. As this member user, create a new NSFW community with valid visibility,
 *    status, and posting configuration flags via
 *    /communityPlatform/memberUser/communities.
 * 3. Subscribe the same member user to that community using
 *    /communityPlatform/memberUser/subscriptions.
 * 4. Call PATCH /communityPlatform/memberUser/discovery/feeds/home three times,
 *    with the same page/limit/sortMode but different NSFW and safety
 *    configurations:
 *
 *    - (A) nsfwFilter = "exclude", safetyLevel = "strict".
 *    - (B) nsfwFilter = "include", safetyLevel = "standard".
 *    - (C) nsfwFilter = "only", safetyLevel = "relaxed".
 * 5. For each response:
 *
 *    - Assert it matches IPageICommunityPlatformDiscoveryHomeFeed.ISummary via
 *         typia.assert.
 *    - Assert pagination.current and pagination.limit echo the requested values, and
 *         that records/pages are non-negative.
 *    - Iterate sections and items, asserting each summary DTO type for additional
 *         safety, but do not validate business semantics.
 * 6. Compare the three responses to ensure that all filter combinations yield
 *    structurally consistent responses:
 *
 *    - Pagination objects across A/B/C should be deeply equal, since we use the same
 *         page/limit.
 *    - The high-level shape of data arrays is consistent type-wise. We do not assert
 *         specific content differences because feed composition depends on
 *         posts we cannot create with the given API surface.
 */
export async function test_api_discovery_home_feed_nsfw_and_safety_filters(
  connection: api.IConnection,
) {
  // 1. Register a new member user
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create an NSFW community as this user
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Subscribe the member user to the NSFW community
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionBody },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // Common pagination setup
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  // Helper to build a request body with varying nsfw/safety
  const buildRequest = (
    nsfwFilter: "exclude" | "include" | "only",
    safetyLevel: "strict" | "standard" | "relaxed",
  ): ICommunityPlatformDiscoveryHomeFeed.IRequest => {
    const body = {
      page,
      limit,
      sortMode: "hot" as const,
      nsfwFilter,
      safetyLevel,
      excludeSeenItems: false,
    } satisfies ICommunityPlatformDiscoveryHomeFeed.IRequest;
    return body;
  };

  // 4A. nsfwFilter = "exclude", safetyLevel = "strict"
  const requestA = buildRequest("exclude", "strict");
  const feedA: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
      connection,
      { body: requestA },
    );
  typia.assert<IPageICommunityPlatformDiscoveryHomeFeed.ISummary>(feedA);

  // 4B. nsfwFilter = "include", safetyLevel = "standard"
  const requestB = buildRequest("include", "standard");
  const feedB: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
      connection,
      { body: requestB },
    );
  typia.assert<IPageICommunityPlatformDiscoveryHomeFeed.ISummary>(feedB);

  // 4C. nsfwFilter = "only", safetyLevel = "relaxed"
  const requestC = buildRequest("only", "relaxed");
  const feedC: IPageICommunityPlatformDiscoveryHomeFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.home.index(
      connection,
      { body: requestC },
    );
  typia.assert<IPageICommunityPlatformDiscoveryHomeFeed.ISummary>(feedC);

  // 5. Validate pagination metadata for each response
  const assertPagination = (
    titlePrefix: string,
    output: IPageICommunityPlatformDiscoveryHomeFeed.ISummary,
  ) => {
    const p = output.pagination;
    TestValidator.equals(
      `${titlePrefix} current page matches request`,
      p.current,
      page as number,
    );
    TestValidator.equals(
      `${titlePrefix} limit matches request`,
      p.limit,
      limit as number,
    );
    TestValidator.predicate(
      `${titlePrefix} records non-negative`,
      p.records >= 0,
    );
    TestValidator.predicate(`${titlePrefix} pages non-negative`, p.pages >= 0);
  };

  assertPagination("feedA", feedA);
  assertPagination("feedB", feedB);
  assertPagination("feedC", feedC);

  // 5b. Deep-assert section and item structures (typia.assert already used
  // at top-level, but we iterate for clarity and additional coverage).
  const assertSectionsAndItems = (
    titlePrefix: string,
    output: IPageICommunityPlatformDiscoveryHomeFeed.ISummary,
  ) => {
    for (const feed of output.data) {
      typia.assert<ICommunityPlatformDiscoveryHomeFeed.ISummary>(feed);
      for (const section of feed.sections) {
        typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(section);
        for (const item of section.items) {
          typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(item);
        }
      }
    }
    TestValidator.predicate(
      `${titlePrefix} data array defined`,
      Array.isArray(output.data),
    );
  };

  assertSectionsAndItems("feedA", feedA);
  assertSectionsAndItems("feedB", feedB);
  assertSectionsAndItems("feedC", feedC);

  // 6. Structural consistency checks between feeds under different filters
  TestValidator.equals(
    "pagination consistent between A and B",
    feedA.pagination,
    feedB.pagination,
  );
  TestValidator.equals(
    "pagination consistent between B and C",
    feedB.pagination,
    feedC.pagination,
  );

  // Compare that the three data arrays are all arrays; we do not enforce
  // exact equality of contents, but we can compare lengths as a weak
  // structural indicator.
  TestValidator.predicate(
    "all feeds have data arrays",
    Array.isArray(feedA.data) &&
      Array.isArray(feedB.data) &&
      Array.isArray(feedC.data),
  );

  TestValidator.predicate(
    "feed data lengths are non-negative",
    feedA.data.length >= 0 && feedB.data.length >= 0 && feedC.data.length >= 0,
  );
}
