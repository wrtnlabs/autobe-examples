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

/**
 * Validate that platform admin can search default feeds filtered by
 * platform-default flag.
 *
 * Flow:
 *
 * 1. Join as platform admin to establish authenticated context.
 * 2. Create two default feed configs: one platform-default, one
 *    non-platform-default.
 * 3. Search with isPlatformDefault=true and ensure only platform-default ids
 *    appear.
 * 4. Search with isPlatformDefault=false and ensure only non-platform-default ids
 *    appear.
 * 5. Validate pagination metadata consistency.
 */
export async function test_api_platform_admin_default_feeds_search_platform_default_flag(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and establish authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);

  // 2. Create two default feed configurations with distinct flags and codes
  const platformDefaultCreate = {
    feed_code: `platform-default-${RandomGenerator.alphaNumeric(8)}`,
    feed_type: "onboarding",
    is_active: true,
    is_platform_default: true,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const nonPlatformDefaultCreate = {
    feed_code: `non-platform-default-${RandomGenerator.alphaNumeric(8)}`,
    feed_type: "recommended",
    is_active: true,
    is_platform_default: false,
  } satisfies ICommunityPlatformDefaultFeed.ICreate;

  const platformDefault =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: platformDefaultCreate },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(platformDefault);

  const nonPlatformDefault =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.create(
      connection,
      { body: nonPlatformDefaultCreate },
    );
  typia.assert<ICommunityPlatformDefaultFeed>(nonPlatformDefault);

  // Sanity: created ids differ
  TestValidator.notEquals(
    "created platform-default and non-platform-default feeds must differ",
    platformDefault.id,
    nonPlatformDefault.id,
  );

  // Helper for common pagination assertions
  const assertPaginationConsistency = (
    title: string,
    pagination: IPage.IPagination,
    dataLength: number,
  ): void => {
    TestValidator.equals(
      `${title} - pagination.records equals data length`,
      dataLength,
      pagination.records,
    );

    TestValidator.predicate(
      `${title} - pagination.limit is positive or zero`,
      pagination.limit >= 0,
    );

    TestValidator.predicate(
      `${title} - pagination.pages is non-negative`,
      pagination.pages >= 0,
    );
  };

  // 3. Search with isPlatformDefault = true
  const platformDefaultPageNumber = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;
  const platformDefaultPageSize = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const platformDefaultSearchBody = {
    page: platformDefaultPageNumber,
    pageSize: platformDefaultPageSize,
    isPlatformDefault: true,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  const platformDefaultPage =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: platformDefaultSearchBody },
    );
  typia.assert<IPageICommunityPlatformDefaultFeed.ISummary>(
    platformDefaultPage,
  );

  const platformDefaultIds = platformDefaultPage.data.map((s) => s.id);

  // The created platform-default id must appear in true-filter result
  TestValidator.predicate(
    "platform-default search must contain created platform-default feed id",
    platformDefaultIds.includes(platformDefault.id),
  );

  // The created non-platform-default id must NOT appear in true-filter result
  TestValidator.predicate(
    "platform-default search must not contain non-platform-default feed id",
    !platformDefaultIds.includes(nonPlatformDefault.id),
  );

  assertPaginationConsistency(
    "isPlatformDefault=true search",
    platformDefaultPage.pagination,
    platformDefaultPage.data.length,
  );

  // 4. Search with isPlatformDefault = false
  const nonPlatformDefaultPageNumber = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;
  const nonPlatformDefaultPageSize = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const nonPlatformDefaultSearchBody = {
    page: nonPlatformDefaultPageNumber,
    pageSize: nonPlatformDefaultPageSize,
    isPlatformDefault: false,
  } satisfies ICommunityPlatformDefaultFeed.IRequest;

  const nonPlatformDefaultPage =
    await api.functional.communityPlatform.platformAdmin.defaultFeeds.index(
      connection,
      { body: nonPlatformDefaultSearchBody },
    );
  typia.assert<IPageICommunityPlatformDefaultFeed.ISummary>(
    nonPlatformDefaultPage,
  );

  const nonPlatformDefaultIds = nonPlatformDefaultPage.data.map((s) => s.id);

  // The created non-platform-default id must appear in false-filter result
  TestValidator.predicate(
    "non-platform-default search must contain created non-platform-default feed id",
    nonPlatformDefaultIds.includes(nonPlatformDefault.id),
  );

  // The created platform-default id must NOT appear in false-filter result
  TestValidator.predicate(
    "non-platform-default search must not contain platform-default feed id",
    !nonPlatformDefaultIds.includes(platformDefault.id),
  );

  assertPaginationConsistency(
    "isPlatformDefault=false search",
    nonPlatformDefaultPage.pagination,
    nonPlatformDefaultPage.data.length,
  );

  // 5. Ensure that no id is shared between the two filtered result sets
  const intersection = platformDefaultIds.filter((id) =>
    nonPlatformDefaultIds.includes(id),
  );

  TestValidator.equals(
    "no feed id should appear in both platform-default and non-platform-default search results",
    intersection.length,
    0,
  );
}
