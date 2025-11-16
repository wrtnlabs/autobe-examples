import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Validate date range filtering and ordering for community subscriber listings.
 *
 * Business purpose
 *
 * - Ensure that the subscribers index endpoint for a community correctly accepts
 *   joinedAtFrom/joinedAtTo filters when listing membership summaries.
 * - Confirm that ordering by the joinedAt field works in both ascending and
 *   descending directions.
 * - Sanity-check pagination metadata when filters are applied.
 *
 * Constraints and available APIs
 *
 * - Authentication: only a memberUser can create communities, so we first call
 *   POST /auth/memberUser/join using api.functional.auth.memberUser.join.
 * - Community creation: we create a community using POST
 *   /communityPlatform/memberUser/communities via
 *   api.functional.communityPlatform.memberUser.communities.create and obtain
 *   its id.
 * - Subscriber listing: we list subscribers using PATCH
 *   /communityPlatform/communities/{communityId}/subscribers via
 *   api.functional.communityPlatform.communities.subscribers.index.
 * - No explicit membership creation API is provided, so this test treats the
 *   subscribers.index response as a black box and validates only structural
 *   invariants: joinedAt-based ordering and pagination behavior, while still
 *   passing joinedAtFrom/joinedAtTo to exercise those filters.
 *
 * Test flow
 *
 * 1. Join as a new memberUser using realistic ICommunityPlatformMemberuser.IJoin
 *    data. Assert the returned ICommunityPlatformMemberuser.IAuthorized and
 *    rely on the SDK to attach the token to the connection.
 * 2. Create a new community using ICommunityPlatformCommunity.ICreate and assert
 *    the resulting ICommunityPlatformCommunity. Capture its id.
 * 3. Build a base filter (ICommunityPlatformCommunityMembership.IRequest) that
 *    sets page and pageSize to reasonable values and orderBy to "joinedAt". For
 *    joinedAtFrom/joinedAtTo, use a very wide window (e.g., from 1970 through
 *    2100) so all realistic joinedAt timestamps fall inside it, avoiding
 *    brittleness while still exercising the filter parameters.
 * 4. Call subscribers.index with ascending order (orderDirection: "asc").
 * 5. Validate the ascending result:
 *
 *    - Typia.assert on the IPageICommunityPlatformCommunityMembership.ISummary
 *         response.
 *    - If there is more than one record, assert that joinedAt is non-decreasing
 *         across the list.
 *    - Assert that pagination.current matches the requested page and that
 *         pagination.limit is at least the number of returned records.
 * 6. Repeat with descending order (orderDirection: "desc") and assert that
 *    joinedAt is non-increasing across the list plus the same pagination
 *    invariants.
 */
export async function test_api_community_subscribers_index_joined_at_date_range(
  connection: api.IConnection,
) {
  // 1. Register a memberUser and obtain an authorized session.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new community as this memberUser.
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Construct a very wide joinedAt date-time window to safely encompass
  // any realistic membership timestamps, while still exercising the filters.
  const joinedAtFrom = new Date("1970-01-01T00:00:00.000Z").toISOString();
  const joinedAtTo = new Date("2100-01-01T00:00:00.000Z").toISOString();

  // Helper to assert monotonic ordering in the given direction.
  const assertMonotonic = (
    title: string,
    items: ICommunityPlatformCommunityMembership.ISummary[],
    direction: "asc" | "desc",
  ): void => {
    if (items.length < 2) return;
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1].joinedAt;
      const curr = items[i].joinedAt;
      if (direction === "asc") {
        TestValidator.predicate(`${title} (non-decreasing)`, prev <= curr);
      } else {
        TestValidator.predicate(`${title} (non-increasing)`, prev >= curr);
      }
    }
  };

  // 4. Base request body for membership search with ascending order.
  const baseRequestAsc = {
    page: 1,
    pageSize: 50,
    joinedAtFrom,
    joinedAtTo,
    orderBy: "joinedAt",
    orderDirection: "asc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const ascPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      connection,
      {
        communityId: community.id,
        body: baseRequestAsc,
      },
    );
  typia.assert(ascPage);

  // 5. Validate ascending ordering on joinedAt when there are multiple records.
  assertMonotonic(
    "joinedAt ordering for asc subscribers.index",
    ascPage.data,
    "asc",
  );

  // Validate basic pagination invariants for the ascending page.
  TestValidator.equals(
    "pagination.current matches requested page (asc)",
    ascPage.pagination.current,
    baseRequestAsc.page ?? 1,
  );
  TestValidator.predicate(
    "pagination.limit is at least the returned data length (asc)",
    ascPage.pagination.limit >= ascPage.data.length,
  );

  // 6. Repeat with descending order.
  const baseRequestDesc = {
    page: 1,
    pageSize: 50,
    joinedAtFrom,
    joinedAtTo,
    orderBy: "joinedAt",
    orderDirection: "desc" as const,
  } satisfies ICommunityPlatformCommunityMembership.IRequest;

  const descPage: IPageICommunityPlatformCommunityMembership.ISummary =
    await api.functional.communityPlatform.communities.subscribers.index(
      connection,
      {
        communityId: community.id,
        body: baseRequestDesc,
      },
    );
  typia.assert(descPage);

  assertMonotonic(
    "joinedAt ordering for desc subscribers.index",
    descPage.data,
    "desc",
  );

  TestValidator.equals(
    "pagination.current matches requested page (desc)",
    descPage.pagination.current,
    baseRequestDesc.page ?? 1,
  );
  TestValidator.predicate(
    "pagination.limit is at least the returned data length (desc)",
    descPage.pagination.limit >= descPage.data.length,
  );
}
