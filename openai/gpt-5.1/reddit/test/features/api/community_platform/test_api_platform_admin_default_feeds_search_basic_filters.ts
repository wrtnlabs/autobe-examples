import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDefaultFeed";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDefaultFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDefaultFeed";

export async function test_api_platform_admin_default_feeds_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Seed default feed configurations with varying attributes
  const seedDefinitions: ICommunityPlatformDefaultFeed.ICreate[] = [
    {
      feed_code: "feed_code_popular_active_platform_default",
      feed_type: "popular",
      is_active: true,
      is_platform_default: true,
    },
    {
      feed_code: "feed_code_popular_active_non_default",
      feed_type: "popular",
      is_active: true,
      is_platform_default: false,
    },
    {
      feed_code: "feed_code_popular_inactive",
      feed_type: "popular",
      is_active: false,
      is_platform_default: false,
    },
    {
      feed_code: "feed_code_onboarding_active",
      feed_type: "onboarding",
      is_active: true,
      is_platform_default: false,
    },
    {
      feed_code: "feed_code_onboarding_inactive",
      feed_type: "onboarding",
      is_active: false,
      is_platform_default: false,
    },
    {
      feed_code: "feed_code_other_active",
      feed_type: "other",
      is_active: true,
      is_platform_default: false,
    },
  ];

  const createdFeeds: ICommunityPlatformDefaultFeed[] = [];
  for (const def of seedDefinitions) {
    const created =
      await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
        connection,
        { body: def },
      );
    typia.assert<ICommunityPlatformDefaultFeed>(created);
    createdFeeds.push(created);
  }

  // Helper: count matching seeds for later expectations
  const countMatching = (
    predicate: (c: ICommunityPlatformDefaultFeed.ICreate) => boolean,
  ) => seedDefinitions.filter(predicate).length;

  // 3. Filter by specific feedCode, expect exactly one match
  const targetFeedCode = seedDefinitions[0]!.feed_code;
  const feedCodeRequest = {
    page: 1,
    pageSize: 10,
    feedCode: targetFeedCode,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  const byFeedCode =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: feedCodeRequest },
    );
  typia.assert<IPageICommunityPlatformDefaultFeed.ISummary>(byFeedCode);

  const paginationByFeedCode = byFeedCode.pagination;
  const dataByFeedCode = byFeedCode.data;

  TestValidator.predicate(
    "filter by feedCode returns at least one record",
    dataByFeedCode.length >= 1,
  );

  // Because IRequest.feedCode is unique by business rule, we expect exactly one match
  TestValidator.equals(
    "filter by feedCode returns exactly one record in data",
    dataByFeedCode.length,
    1,
  );
  TestValidator.equals(
    "pagination.records for feedCode filter is 1",
    paginationByFeedCode.records,
    1,
  );

  // 4. Filter by feedTypes and isActive = true
  const activePopularOrOnboardingCount = countMatching(
    (c) =>
      c.is_active === true &&
      (c.feed_type === "popular" || c.feed_type === "onboarding"),
  );

  const feedTypesRequest = {
    page: 1,
    pageSize: 10,
    feedTypes: ["popular", "onboarding"],
    isActive: true,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  const byFeedTypes =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: feedTypesRequest },
    );
  typia.assert<IPageICommunityPlatformDefaultFeed.ISummary>(byFeedTypes);

  const paginationByFeedTypes = byFeedTypes.pagination;
  const dataByFeedTypes = byFeedTypes.data;

  TestValidator.equals(
    "pagination.records for active popular/onboarding filter matches seeded expectations",
    paginationByFeedTypes.records,
    activePopularOrOnboardingCount,
  );

  // All returned summaries must be active
  for (const summary of dataByFeedTypes) {
    TestValidator.equals(
      "every returned summary for active filter has isActive === true",
      summary.isActive,
      true,
    );
  }

  // 5. Pagination behavior: small pageSize for the same filter
  const smallPageSize = 1;
  const pagedRequestPage1 = {
    page: 1,
    pageSize: smallPageSize,
    feedTypes: ["popular", "onboarding"],
    isActive: true,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  const pagedPage1 =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: pagedRequestPage1 },
    );
  typia.assert<IPageICommunityPlatformDefaultFeed.ISummary>(pagedPage1);

  const pagedRequestPage2 = {
    page: 2,
    pageSize: smallPageSize,
    feedTypes: ["popular", "onboarding"],
    isActive: true,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  const pagedPage2 =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: pagedRequestPage2 },
    );
  typia.assert<IPageICommunityPlatformDefaultFeed.ISummary>(pagedPage2);

  const pagination1 = pagedPage1.pagination;
  const pagination2 = pagedPage2.pagination;

  TestValidator.equals(
    "pagination.limit equals requested pageSize for page 1",
    pagination1.limit,
    smallPageSize,
  );
  TestValidator.equals(
    "pagination.current equals requested page for page 1",
    pagination1.current,
    1,
  );

  TestValidator.equals(
    "pagination.limit equals requested pageSize for page 2",
    pagination2.limit,
    smallPageSize,
  );
  TestValidator.equals(
    "pagination.current equals requested page for page 2",
    pagination2.current,
    2,
  );

  // Both pages should report the same total records and pages
  TestValidator.equals(
    "pagination.records is consistent across pages",
    pagination1.records,
    pagination2.records,
  );
  TestValidator.equals(
    "pagination.pages is consistent across pages",
    pagination1.pages,
    pagination2.pages,
  );

  // Each page's data length should not exceed the requested page size
  TestValidator.predicate(
    "page 1 data length does not exceed pageSize",
    pagedPage1.data.length <= smallPageSize,
  );
  TestValidator.predicate(
    "page 2 data length does not exceed pageSize",
    pagedPage2.data.length <= smallPageSize,
  );
}
