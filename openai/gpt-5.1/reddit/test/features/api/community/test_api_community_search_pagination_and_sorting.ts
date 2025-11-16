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
 * Validate community search pagination and sorting behavior.
 *
 * This test covers the end-to-end workflow for the community discovery endpoint
 * PATCH /communityPlatform/communities:
 *
 * 1. Register a memberUser via /auth/memberUser/join to obtain an authenticated
 *    context able to create communities.
 * 2. Create a sufficiently large set of communities (>= 10) through POST
 *    /communityPlatform/memberUser/communities to make pagination meaningful.
 *    Use diverse names and slugs but stable, deterministic creation order.
 * 3. Invoke PATCH /communityPlatform/communities with an
 *    ICommunityPlatformCommunity.IRequest body specifying page=1 and limit=5,
 *    along with a deterministic sortBy value (here we rely on slug as the
 *    logical sortable field) and sortOrder="asc".
 * 4. Assert that the response uses IPageICommunityPlatformCommunity.ISummary, that
 *    pagination.current is 1, limit is 5, and records/pages reflect at least
 *    the number of created communities.
 * 5. Capture the ordered list of IDs (or slugs) on page 1, then request page=2
 *    with the same sort options and verify no overlap between pages and that
 *    global ordering remains consistent.
 * 6. Repeat with sortOrder="desc" and verify that the combined ordering across
 *    pages is the reverse of the ascending order.
 * 7. On each page, confirm that every summary entry has required fields such as
 *    id, slug, name, memberCount, and isRestricted populated according to the
 *    ISummary DTO.
 */
export async function test_api_community_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Join as a memberUser to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 2. Seed multiple communities (e.g., 12) so that we have at least
  //    two full pages with limit=5.
  const communityCount = 12;
  const baseSlugPrefix = RandomGenerator.alphabets(8);

  const createdCommunities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(communityCount, async (index) => {
      const slug = `${baseSlugPrefix}-${index.toString().padStart(2, "0")}`;
      const createBody = {
        slug,
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

      const created =
        await api.functional.communityPlatform.memberUser.communities.create(
          connection,
          { body: createBody },
        );
      typia.assert<ICommunityPlatformCommunity>(created);
      return created;
    });

  // Basic sanity: we created the expected number of communities.
  TestValidator.equals(
    "created community count matches expectation",
    createdCommunities.length,
    communityCount,
  );

  // Helper to build a search request body
  const buildRequest = (
    page: number,
    limit: number,
    sortOrder: string,
  ): ICommunityPlatformCommunity.IRequest => ({
    page: page as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    sortBy: "slug",
    sortOrder,
  });

  const pageSize = 5;

  // 3. Request first page with ascending sort
  const ascPage1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: buildRequest(1, pageSize, "asc"),
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(ascPage1);

  // Validate pagination metadata for page 1
  const pagination1: IPage.IPagination = ascPage1.pagination;
  typia.assert<IPage.IPagination>(pagination1);

  TestValidator.equals(
    "page1: current page should be 1",
    pagination1.current,
    1,
  );
  TestValidator.equals(
    "page1: limit should equal requested page size",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "page1: records should be at least number of created communities",
    pagination1.records >= createdCommunities.length,
  );
  TestValidator.predicate(
    "page1: pages should be at least 1",
    pagination1.pages >= 1,
  );

  TestValidator.predicate(
    "page1: number of results should not exceed limit",
    ascPage1.data.length <= pageSize,
  );

  // Capture ordering from page 1
  const ascPage1Ids = ascPage1.data.map((c) => c.id);
  const ascPage1Slugs = ascPage1.data.map((c) => c.slug);

  // Validate required summary fields on page 1
  ascPage1.data.forEach((summary, index) => {
    typia.assert<ICommunityPlatformCommunity.ISummary>(summary);
    TestValidator.predicate(
      `page1: summary ${index} must have non-empty id`,
      summary.id.length > 0,
    );
    TestValidator.predicate(
      `page1: summary ${index} must have non-empty slug`,
      summary.slug.length > 0,
    );
    TestValidator.predicate(
      `page1: summary ${index} must have non-empty name`,
      summary.name.length > 0,
    );
    TestValidator.predicate(
      `page1: summary ${index} memberCount should be non-negative`,
      summary.memberCount >= 0,
    );
  });

  // 5. Request second page with same ascending sort options
  const ascPage2: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: buildRequest(2, pageSize, "asc"),
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(ascPage2);

  const pagination2: IPage.IPagination = ascPage2.pagination;
  typia.assert<IPage.IPagination>(pagination2);
  TestValidator.equals(
    "page2: current page should be 2",
    pagination2.current,
    2,
  );
  TestValidator.equals(
    "page2: limit should equal requested page size",
    pagination2.limit,
    pageSize,
  );

  TestValidator.predicate(
    "page2: number of results should not exceed limit",
    ascPage2.data.length <= pageSize,
  );

  const ascPage2Ids = ascPage2.data.map((c) => c.id);
  const ascPage2Slugs = ascPage2.data.map((c) => c.slug);

  // Verify no overlap between page1 and page2 IDs
  const overlapIds = ascPage1Ids.filter((id) => ascPage2Ids.includes(id));
  TestValidator.equals(
    "ascending pages should not share community IDs",
    overlapIds.length,
    0,
  );

  // Verify global ascending slug ordering across the two pages
  const combinedAscSlugs = [...ascPage1Slugs, ...ascPage2Slugs];
  const sortedAscSlugs = [...combinedAscSlugs].sort();
  TestValidator.equals(
    "combined ascending slugs should already be sorted lexicographically",
    combinedAscSlugs,
    sortedAscSlugs,
  );

  // 6. Repeat search with descending sortOrder
  const descPage1: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: buildRequest(1, pageSize, "desc"),
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(descPage1);

  const descPage2: IPageICommunityPlatformCommunity.ISummary =
    await api.functional.communityPlatform.communities.index(connection, {
      body: buildRequest(2, pageSize, "desc"),
    });
  typia.assert<IPageICommunityPlatformCommunity.ISummary>(descPage2);

  const descPage1Slugs = descPage1.data.map((c) => c.slug);
  const descPage2Slugs = descPage2.data.map((c) => c.slug);
  const combinedDescSlugs = [...descPage1Slugs, ...descPage2Slugs];

  // For comparison, obtain a base ascending list of slugs via a single
  // sorted array of created communities.
  const createdAscSlugs = [...createdCommunities].map((c) => c.slug).sort();
  const expectedDescSlugs = [...createdAscSlugs].reverse();

  // Ensure that at least the slice we fetched (up to 10 items) matches
  // the expected descending order.
  const expectedDescSlice = expectedDescSlugs.slice(
    0,
    combinedDescSlugs.length,
  );
  TestValidator.equals(
    "descending pages combined should follow global descending slug order (prefix)",
    combinedDescSlugs,
    expectedDescSlice,
  );

  // 7. Validate summary structure for descending pages as well
  const validateSummaryPage = (
    page: IPageICommunityPlatformCommunity.ISummary,
    label: string,
  ): void => {
    typia.assert<IPageICommunityPlatformCommunity.ISummary>(page);
    page.data.forEach((summary, index) => {
      typia.assert<ICommunityPlatformCommunity.ISummary>(summary);
      TestValidator.predicate(
        `${label}: summary ${index} must have non-empty id`,
        summary.id.length > 0,
      );
      TestValidator.predicate(
        `${label}: summary ${index} must have non-empty slug`,
        summary.slug.length > 0,
      );
      TestValidator.predicate(
        `${label}: summary ${index} must have non-empty name`,
        summary.name.length > 0,
      );
      TestValidator.predicate(
        `${label}: summary ${index} memberCount should be non-negative`,
        summary.memberCount >= 0,
      );
    });
  };

  validateSummaryPage(descPage1, "desc page1");
  validateSummaryPage(descPage2, "desc page2");
}
