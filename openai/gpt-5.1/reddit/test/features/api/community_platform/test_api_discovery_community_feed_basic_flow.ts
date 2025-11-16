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
 * Validate that an authenticated member user can retrieve a basic discovery
 * feed scoped to a specific community they just created.
 *
 * Business workflow:
 *
 * 1. A guest registers as a memberUser via /auth/memberUser/join, which both
 *    creates a `community_platform_memberusers` row and initializes a
 *    `community_platform_memberuser_sessions` row and returns
 *    ICommunityPlatformMemberuser.IAuthorized with an authorization token.
 * 2. Using that authenticated context, the memberUser creates a new community via
 *    POST /communityPlatform/memberUser/communities, receiving a full
 *    ICommunityPlatformCommunity including its UUID `id`.
 * 3. The same actor immediately requests a community-scoped discovery feed for
 *    that just-created community via PATCH
 *    /communityPlatform/memberUser/discovery/feeds/community/{communityId} with
 *    a minimal, valid discovery request (page=1, limit=20, sortMode="hot").
 * 4. The API should respond with a 200 OK and a payload of
 *    IPageICommunityPlatformDiscoveryCommunityFeed.ISummary whose pagination
 *    block reflects the request (current page 1, limit 20) and whose data is an
 *    array of community feed summaries (possibly empty for a brand-new
 *    community) where each summary has a `sections` array (possibly empty) of
 *    ICommunityPlatformDiscoveryFeedSection.ISummary, and each section has an
 *    `items` array of ICommunityPlatformDiscoveryItem.ISummary.
 * 5. No additional membership or community-subscription step should be required
 *    beyond being an authenticated memberUser; a successful, typed response for
 *    the new community is sufficient evidence that community-level discovery
 *    access is allowed.
 */
export async function test_api_discovery_community_feed_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to obtain an authenticated context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a new community as this member user.
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    description: null,
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Request a discovery feed scoped to this community with minimal params.
  const requestBody = {
    page: 1,
    limit: 20,
    sortMode: "hot" as const,
  } satisfies ICommunityPlatformDiscoveryCommunityFeed.IRequest;

  const page: IPageICommunityPlatformDiscoveryCommunityFeed.ISummary =
    await api.functional.communityPlatform.memberUser.discovery.feeds.community.index(
      connection,
      {
        communityId: community.id,
        body: requestBody,
      },
    );
  typia.assert<IPageICommunityPlatformDiscoveryCommunityFeed.ISummary>(page);

  // 4. Validate pagination metadata and structural expectations.
  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.equals(
    "pagination.current must equal requested page 1",
    pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit must equal requested limit 20",
    pagination.limit,
    20,
  );

  TestValidator.predicate(
    "pagination.records must be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be non-negative",
    pagination.pages >= 0,
  );

  // Confirm that data is an array (already ensured by typing, but assert logic).
  TestValidator.predicate(
    "data array must be defined (possibly empty)",
    Array.isArray(page.data),
  );

  // 5. For each feed summary, ensure sections is an array and items arrays exist.
  for (const summary of page.data) {
    typia.assert<ICommunityPlatformDiscoveryCommunityFeed.ISummary>(summary);

    TestValidator.predicate(
      "each community feed summary must have a sections array",
      Array.isArray(summary.sections),
    );

    for (const section of summary.sections) {
      typia.assert<ICommunityPlatformDiscoveryFeedSection.ISummary>(section);

      TestValidator.predicate(
        "each discovery section must have an items array",
        Array.isArray(section.items),
      );

      for (const item of section.items) {
        typia.assert<ICommunityPlatformDiscoveryItem.ISummary>(item);
      }
    }
  }

  // If we reached here without error, implicit confirmation that
  // a freshly created community can be used as a discovery feed scope
  // without any extra membership/subscription flows.
}
