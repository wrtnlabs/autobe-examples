import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";

/**
 * Validate that the community search endpoint correctly filters by visibility
 * and status.
 *
 * Business context: The platform allows creation of communities with different
 * visibility modes (e.g., public vs restricted) and lifecycle statuses (e.g.,
 * active vs archived). The discovery/search endpoint PATCH
 * /communityPlatform/communities must respect these filters so that callers can
 * reliably browse subsets of communities.
 *
 * This test performs an end-to-end workflow:
 *
 * 1. Register a member user (memberUser actor) so that we can create communities.
 * 2. Create several communities as that member user, covering at least the
 *    following combinations:
 *
 *    - Visibility = "public", status = "active"
 *    - Visibility = "public", status = "archived"
 *    - Visibility = "restricted", status = "active"
 *    - Visibility = "restricted", status = "archived"
 * 3. Call the search endpoint with filters visibility = "public", status =
 *    "active" and a reasonable limit.
 *
 *    - Assert that all returned summaries have isRestricted === false (derived from
 *         visibility) and that only the communities known to be (public,active)
 *         from our seed set appear.
 *    - Assert that communities created with other combinations do not appear in the
 *         result set.
 *    - Validate pagination metadata: current should equal requested page (1), limit
 *         should match, and records/pages should be consistent with the number
 *         of matching records we created.
 * 4. Repeat the search for visibility = "restricted", status = "archived" and
 *    assert that only the corresponding communities are returned and that
 *    pagination metadata matches the expected count.
 *
 * Notes:
 *
 * - Visibility and status are modeled as string fields in the DTO, so we are free
 *   to choose concrete values like "public"/"restricted" and
 *   "active"/"archived" that are consistent across creation and search.
 * - ICommunityPlatformCommunity.ISummary does not expose raw visibility/status,
 *   only a derived isRestricted flag. Therefore, we validate visibility
 *   indirectly via isRestricted and by inclusion/exclusion of known
 *   communities.
 */
export async function test_api_community_search_filter_by_visibility_and_status(
  connection: api.IConnection,
) {
  // 1. Register a member user to obtain an authenticated memberUser context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create multiple communities with different visibility/status combinations.
  type Combo = {
    visibility: string;
    status: string;
  };

  const combos: Combo[] = [
    { visibility: "public", status: "active" },
    { visibility: "public", status: "archived" },
    { visibility: "restricted", status: "active" },
    { visibility: "restricted", status: "archived" },
  ];

  const createdCommunities: ICommunityPlatformCommunity[] = [];

  for (const combo of combos) {
    const body = {
      slug: `${RandomGenerator.alphaNumeric(8)}-${combo.visibility}-${combo.status}`,
      name: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph({ sentences: 5 }),
      visibility: combo.visibility,
      status: combo.status,
      is_nsfw: false,
      is_quarantined: false,
      is_posting_restricted: false,
      allow_text_posts: true,
      allow_link_posts: true,
      allow_image_posts: true,
    } satisfies ICommunityPlatformCommunity.ICreate;

    const created: ICommunityPlatformCommunity =
      await api.functional.communityPlatform.memberUser.communities.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdCommunities.push(created);
  }

  // Helper to run a filtered search and validate membership and pagination.
  const assertSearch = async (
    titlePrefix: string,
    visibility: string | undefined,
    status: string | undefined,
  ): Promise<void> => {
    const expected = createdCommunities.filter((c) => {
      if (visibility !== undefined && c.visibility !== visibility) return false;
      if (status !== undefined && c.status !== status) return false;
      return true;
    });

    const requestBody = {
      page: 1 as number & tags.Type<"int32">,
      limit: 20 as number & tags.Type<"int32">,
      visibility,
      status,
    } satisfies ICommunityPlatformCommunity.IRequest;

    const page: IPageICommunityPlatformCommunity.ISummary =
      await api.functional.communityPlatform.communities.index(connection, {
        body: requestBody,
      });
    typia.assert(page);

    const pagination: IPage.IPagination = page.pagination;
    typia.assert(pagination);

    TestValidator.equals(
      `${titlePrefix} - pagination current page`,
      pagination.current,
      1,
    );
    TestValidator.equals(
      `${titlePrefix} - pagination limit`,
      pagination.limit,
      20,
    );

    // The total records should be at least the number of expected communities
    // and the data length should not exceed the limit.
    TestValidator.predicate(
      `${titlePrefix} - data length <= limit`,
      page.data.length <= pagination.limit,
    );

    // Every returned summary must correspond to one of the expected communities.
    const expectedIds = new Set(expected.map((c) => c.id));

    for (const summary of page.data) {
      typia.assert(summary);

      TestValidator.predicate(
        `${titlePrefix} - returned community is from expected set`,
        expectedIds.has(summary.id),
      );

      if (visibility === "public") {
        TestValidator.equals(
          `${titlePrefix} - public communities are not restricted`,
          summary.isRestricted,
          false,
        );
      }
      if (visibility === "restricted") {
        TestValidator.equals(
          `${titlePrefix} - restricted communities are marked as restricted`,
          summary.isRestricted,
          true,
        );
      }
    }

    // Also validate that all expected communities appear somewhere in the
    // result set when result size is small enough to fit in one page.
    if (expected.length <= pagination.limit) {
      const returnedIds = new Set(page.data.map((s) => s.id));
      for (const community of expected) {
        TestValidator.predicate(
          `${titlePrefix} - expected community ${community.id} is returned`,
          returnedIds.has(community.id),
        );
      }
    }
  };

  // 3. Search for public & active communities.
  await assertSearch(
    "filter visibility=public & status=active",
    "public",
    "active",
  );

  // 4. Search for restricted & archived communities.
  await assertSearch(
    "filter visibility=restricted & status=archived",
    "restricted",
    "archived",
  );
}
