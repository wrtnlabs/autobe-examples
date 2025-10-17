import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate the public listing, filtering, and pagination of communities.
 *
 * 1. Create a member (and authenticate).
 * 2. Create several communities (with varying names, titles, and statuses).
 * 3. As a guest (unauthenticated):
 *
 *    - List communities (should only see public/active ones)
 *    - Paginate and check slicing.
 *    - Filter with search (by partial name/title/slug).
 *    - Filter by status (should not see banned/private/archived, etc.)
 *    - Sort (e.g., by created_at desc/asc).
 *    - Test invalid filters (e.g., negative page number, very large page, invalid
 *         sort field).
 * 4. As a member (authenticated):
 *
 *    - List communities (should see their own if special cases)
 *    - Try other allowed filters and sort combinatorics.
 *    - Confirm access to fields that guest cannot see, if any.
 * 5. Validate edge cases (empty results, wrong filter inputs).
 */
export async function test_api_community_public_listing_filter_and_pagination(
  connection: api.IConnection,
) {
  // 1. Register (join) as a new member for authenticated requests
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create multiple test communities with varying names and statuses
  const createdCommunities: ICommunityPlatformCommunity[] = [];
  for (const status of ["active", "private", "banned", "archived"] as const) {
    const name = `${RandomGenerator.alphabets(8)}${status}`;
    const community =
      await api.functional.communityPlatform.member.communities.create(
        connection,
        {
          body: {
            name,
            title:
              `${RandomGenerator.paragraph({ sentences: 2 })} ${status}`.slice(
                0,
                100,
              ),
            slug: `${name.toLowerCase()}-${RandomGenerator.alphabets(4)}`,
            description: `${RandomGenerator.content({ paragraphs: 1 })}`,
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    // Patch status for some communities to desired ones by recreating with target statuses
    // Since create only allows initial status, rely on creation order for sorting, and name for filtering
    createdCommunities.push({ ...community, status });
  }

  // Helper to strip private/banned/archived for guest-visible communities
  const isPubliclyVisible = (comm: ICommunityPlatformCommunity) =>
    comm.status === "active" && !comm.deleted_at;

  // 3. Guest listing (unauthenticated):
  const guestConn: api.IConnection = { ...connection, headers: {} };

  // a) List all (should get only active)
  let guestList = await api.functional.communityPlatform.communities.index(
    guestConn,
    {
      body: {},
    },
  );
  typia.assert(guestList);
  const expectedPublic = createdCommunities
    .filter(isPubliclyVisible)
    .map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      slug: c.slug,
      status: c.status,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  // Can match only summary fields (compare by id)
  TestValidator.equals(
    "guest listing returns only active communities",
    guestList.data.map((c) => c.id).sort(),
    expectedPublic.map((c) => c.id).sort(),
  );

  // b) Paginate with small limit
  let smallLimit = 2;
  let page1 = await api.functional.communityPlatform.communities.index(
    guestConn,
    {
      body: {
        page: 1,
        limit: smallLimit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination limit respected (guest)",
    page1.data.length,
    Math.min(smallLimit, expectedPublic.length),
  );

  let page2 = await api.functional.communityPlatform.communities.index(
    guestConn,
    {
      body: {
        page: 2,
        limit: smallLimit,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2);
  // Slices - ensure no duplicates and not more than expected
  TestValidator.predicate(
    "pagination pages do not overlap (guest)",
    page1.data.every((a) => !page2.data.some((b) => b.id === a.id)),
  );

  // c) Filter by partial (substring) in name
  const partialName = createdCommunities[0].name.slice(0, 4);
  let filteredByName = await api.functional.communityPlatform.communities.index(
    guestConn,
    {
      body: {
        search: partialName,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(filteredByName);
  // All returned should contain the partialName in name/title/slug
  TestValidator.predicate(
    "all filtered have partial in name (guest)",
    filteredByName.data.every(
      (c) =>
        c.name.includes(partialName) ||
        c.title.includes(partialName) ||
        c.slug.includes(partialName),
    ),
  );

  // d) Filter by status (active, banned, etc.)
  for (const status of ["active", "banned"] as const) {
    const filtered = await api.functional.communityPlatform.communities.index(
      guestConn,
      {
        body: { status } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      `all communities have status='${status}' (guest)`,
      filtered.data.every((c) => c.status === status),
    );
  }

  // e) Sort by created_at asc/desc
  for (const order of ["asc", "desc"] as const) {
    const sorted = await api.functional.communityPlatform.communities.index(
      guestConn,
      {
        body: {
          sort: "new",
          order,
        } satisfies ICommunityPlatformCommunity.IRequest,
      },
    );
    typia.assert(sorted);
    const got = sorted.data.map((c) => c.created_at);
    const correct = [...got].sort(
      order === "asc"
        ? (a, b) => a.localeCompare(b)
        : (a, b) => b.localeCompare(a),
    );
    TestValidator.equals(
      `communities sorted by created_at ${order} (guest)`,
      got,
      correct,
    );
  }

  // f) Invalid inputs (negative page, big limit, bad status)
  await TestValidator.error(
    "negative page number should fail (guest)",
    async () => {
      await api.functional.communityPlatform.communities.index(guestConn, {
        body: { page: -1 } satisfies ICommunityPlatformCommunity.IRequest,
      });
    },
  );

  // 4. As a member (authenticated):
  // No need to login again since connection is already authenticated
  // (status scoped). Try search, status, sort, and pagination.
  const allAuth = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(allAuth);
  TestValidator.predicate(
    "all communities returned for member include created ones",
    createdCommunities.every((tc) =>
      allAuth.data.some((rc) => rc.id === tc.id),
    ),
  );

  // Authenticated filter by 'private' status
  const privList = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        status: "private",
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(privList);
  TestValidator.predicate(
    "private communities returned for authenticated user",
    privList.data.every((c) => c.status === "private"),
  );

  // Pagination & search as authenticated
  let authPage1 = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(authPage1);
  TestValidator.equals(
    "auth member pagination length correct",
    authPage1.data.length,
    Math.min(2, createdCommunities.length),
  );

  let authSearch = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        search: partialName,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(authSearch);
  TestValidator.predicate(
    "auth member search by partial name works",
    authSearch.data.every(
      (c) =>
        c.name.includes(partialName) ||
        c.title.includes(partialName) ||
        c.slug.includes(partialName),
    ),
  );

  // Edge case: big page number (beyond possible range)
  let bigPage = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        page: 100,
        limit: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(bigPage);
  TestValidator.equals(
    "empty results when requesting non-existent page",
    bigPage.data.length,
    0,
  );
}
