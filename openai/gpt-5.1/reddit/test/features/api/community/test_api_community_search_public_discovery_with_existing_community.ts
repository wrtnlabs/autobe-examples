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
 * Validate public discovery search for existing communities.
 *
 * Business purpose:
 *
 * - Ensure that once a member user creates a public, active community, the
 *   general community search endpoint (PATCH /communityPlatform/communities)
 *   can discover it using basic search parameters.
 * - Confirm that the paginated summary response structure is correct and that
 *   summary-level business fields (memberCount, isRestricted) look reasonable.
 *
 * Steps:
 *
 * 1. Join as a new memberUser using /auth/memberUser/join to obtain an
 *    authenticated connection (token is handled by the SDK).
 * 2. Create one public, active community via
 *    /communityPlatform/memberUser/communities with a distinctive slug and name
 *    so that we can target it in search.
 * 3. Optionally create a second non-public or restricted community to make
 *    visibility filtering meaningful.
 * 4. Call PATCH /communityPlatform/communities with a request body using
 *    ICommunityPlatformCommunity.IRequest specifying:
 *
 *    - Page = 1, limit = a small positive number (e.g., 20)
 *    - Search = the created community slug (exact match) so that the community
 *         should appear in the result set
 *    - Visibility = "public" so that only public communities are targeted.
 * 5. Assert the response type is IPageICommunityPlatformCommunity.ISummary using
 *    typia.assert.
 * 6. Validate that:
 *
 *    - Pagination.current is 1, limit is positive, records and pages are
 *         non-negative.
 *    - Data array is non-empty.
 * 7. Find a summary entry whose slug matches the created community slug:
 *
 *    - Use Array.prototype.find.
 *    - Assert that such a summary exists.
 *    - Assert that its slug and name equal the created community’s slug and name
 *         (identity consistency between create and search).
 * 8. Validate business fields on the matched summary:
 *
 *    - MemberCount >= 0.
 *    - IsRestricted is false for a visibility="public" community (assuming
 *         restricted means non-public/limited visibility).
 * 9. (Optional) If a second non-public community was created and the search used
 *    visibility="public", assert that the second community’s slug is not
 *    present in the result set.
 */
export async function test_api_community_search_public_discovery_with_existing_community(
  connection: api.IConnection,
) {
  // 1. Join as a new memberUser (authentication + token setup)
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
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

  // 2. Create a distinct public, active community
  const baseSlug = RandomGenerator.alphaNumeric(12);
  const communityCreateBody = {
    slug: baseSlug,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  // 3. Optionally create a second, non-public community
  const secondCommunityCreateBody = {
    slug: `${baseSlug}-private`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "private",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: true,
    allow_text_posts: true,
    allow_link_posts: false,
    allow_image_posts: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const secondCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: secondCommunityCreateBody,
      },
    );
  typia.assert(secondCommunity);

  // 4. Search communities via PATCH /communityPlatform/communities
  const requestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    search: createdCommunity.slug,
    visibility: "public",
    status: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    sortBy: undefined,
    sortOrder: undefined,
  } satisfies ICommunityPlatformCommunity.IRequest;

  const pageResult: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: requestBody,
    });
  typia.assert(pageResult);

  // 5. Basic pagination sanity checks
  TestValidator.equals(
    "pagination current page should be 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    pageResult.pagination.pages >= 0,
  );

  // 6. Ensure data array is non-empty
  TestValidator.predicate(
    "search result data should be non-empty",
    pageResult.data.length > 0,
  );

  // 7. Locate summary for the created community
  const matchedSummary = pageResult.data.find(
    (summary) => summary.slug === createdCommunity.slug,
  );
  TestValidator.predicate(
    "created community should appear in search results",
    matchedSummary !== undefined,
  );

  if (!matchedSummary) return;
  typia.assertGuard<ICommunityPlatformCommunity.ISummary>(matchedSummary);

  TestValidator.equals(
    "matched summary slug equals created community slug",
    matchedSummary.slug,
    createdCommunity.slug,
  );
  TestValidator.equals(
    "matched summary name equals created community name",
    matchedSummary.name,
    createdCommunity.name,
  );

  // 8. Business-field checks on the summary
  TestValidator.predicate(
    "memberCount should be non-negative",
    matchedSummary.memberCount >= 0,
  );
  TestValidator.equals(
    "public community should not be restricted in summary",
    matchedSummary.isRestricted,
    false,
  );

  // 9. Optional: verify that the private community is not in visibility=public search
  const privateInResults = pageResult.data.find(
    (summary) => summary.slug === secondCommunity.slug,
  );
  TestValidator.equals(
    "private community slug should not appear in public visibility search",
    privateInResults,
    undefined,
  );
}
