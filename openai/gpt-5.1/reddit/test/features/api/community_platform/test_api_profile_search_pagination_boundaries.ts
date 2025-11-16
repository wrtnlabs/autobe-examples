import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserProfile";

export async function test_api_profile_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new member user via the join endpoint
  const joinBody = typia.random<ICommunityPlatformMemberuser.IJoin>();
  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community as a realistic precondition
  const communityCreateBody =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Initial profile search with small page size to capture pagination metadata
  const initialPageRequest = {
    page: {
      page: 0,
      limit: 5,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const initialPage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: initialPageRequest,
    });
  typia.assert(initialPage);

  const initialPagination = initialPage.pagination;
  const initialRecords = initialPagination.records;
  const initialPages = initialPagination.pages;
  const limit = initialPagination.limit;

  // Base invariants about the first call
  TestValidator.equals(
    "initial current page should equal requested page 0",
    initialPagination.current,
    0,
  );
  TestValidator.equals("initial limit should equal requested limit", limit, 5);

  // 4. Compute in-range and out-of-range page indices based on metadata
  const inRangePageIndex: number = initialPages > 0 ? initialPages - 1 : 0;
  const outOfRangePageIndex: number = initialPages > 0 ? initialPages + 5 : 10;

  // 5. In-range page validation
  const inRangeRequest = {
    page: {
      page: inRangePageIndex,
      limit,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const inRangePage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: inRangeRequest,
    });
  typia.assert(inRangePage);

  const inRangePagination = inRangePage.pagination;

  TestValidator.equals(
    "in-range current page matches requested index",
    inRangePagination.current,
    inRangePageIndex,
  );
  TestValidator.equals(
    "in-range limit remains consistent",
    inRangePagination.limit,
    limit,
  );
  TestValidator.equals(
    "in-range total records remain consistent with initial",
    inRangePagination.records,
    initialRecords,
  );
  TestValidator.equals(
    "in-range total pages remain consistent with initial",
    inRangePagination.pages,
    initialPages,
  );

  if (initialRecords > 0) {
    TestValidator.predicate(
      "in-range page should have non-empty data when there are records",
      inRangePage.data.length > 0,
    );
  } else {
    TestValidator.equals(
      "in-range page data should be empty when there are no records",
      inRangePage.data.length,
      0,
    );
  }

  // 6. Out-of-range page validation
  const outOfRangeRequest = {
    page: {
      page: outOfRangePageIndex,
      limit,
    },
  } satisfies ICommunityPlatformUserProfile.IRequest;

  const outOfRangePage: IPageICommunityPlatformUserProfile.ISummary =
    await api.functional.communityPlatform.profiles.index(connection, {
      body: outOfRangeRequest,
    });
  typia.assert(outOfRangePage);

  const outOfRangePagination = outOfRangePage.pagination;

  TestValidator.equals(
    "out-of-range current page matches requested index",
    outOfRangePagination.current,
    outOfRangePageIndex,
  );
  TestValidator.equals(
    "out-of-range limit remains consistent",
    outOfRangePagination.limit,
    limit,
  );
  TestValidator.equals(
    "out-of-range total records remain consistent with initial",
    outOfRangePagination.records,
    initialRecords,
  );
  TestValidator.equals(
    "out-of-range total pages remain consistent with initial",
    outOfRangePagination.pages,
    initialPages,
  );

  if (initialRecords > 0) {
    TestValidator.equals(
      "out-of-range page should have empty data when requesting beyond last page",
      outOfRangePage.data.length,
      0,
    );
  } else {
    TestValidator.equals(
      "out-of-range page data remains empty when there are no records",
      outOfRangePage.data.length,
      0,
    );
  }
}
