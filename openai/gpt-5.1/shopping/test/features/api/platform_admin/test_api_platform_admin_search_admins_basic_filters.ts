import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformadmin";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin search with basic filters and pagination.
 *
 * This test ensures that:
 *
 * 1. A platform administrator created via the join endpoint can authenticate and
 *    use the admin search endpoint.
 * 2. The search endpoint returns a paginated list of platform admin summaries that
 *    respect the provided free‑text `search` keyword and `status` filter.
 * 3. Pagination metadata (current, limit, records, pages) is coherent with the
 *    returned `data` array.
 */
export async function test_api_platform_admin_search_admins_basic_filters(
  connection: api.IConnection,
) {
  // 1. Arrange – create an initial platform admin (also authenticates)
  const baseJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const primaryAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: baseJoinBody,
    });
  typia.assert(primaryAdmin);

  // 2. Create a brand to satisfy the brand dependency and validate auth context
  const brandBody = {
    name: RandomGenerator.name(1),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri: "https://cdn.example.com/logo.png",
  } satisfies IShoppingMallBrand.ICreate;

  const brand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandBody,
    });
  typia.assert(brand);

  // 3. Create additional platform admins to have a richer dataset
  const secondAdminEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const secondJoinBody = {
    email: secondAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/campaign/second",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const secondAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: secondJoinBody,
    });
  typia.assert(secondAdmin);

  const thirdAdminEmail = `${RandomGenerator.alphabets(10)}@example.com`;
  const thirdJoinBody = {
    email: thirdAdminEmail,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/campaign/third",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const thirdAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: thirdJoinBody,
    });
  typia.assert(thirdAdmin);

  // 4. Discover an existing status value and collect baseline admin summaries
  const discoveryRequestBody = {
    page: 1 as number,
    limit: 10 as number,
  } satisfies IShoppingMallPlatformAdmin.IRequest;

  const discoveryPage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      {
        body: discoveryRequestBody,
      },
    );
  typia.assert(discoveryPage);

  TestValidator.predicate(
    "discovery pagination current is non-negative",
    discoveryPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "discovery pagination limit is positive",
    discoveryPage.pagination.limit > 0,
  );

  const baselineAdmins: IShoppingMallPlatformAdmin.ISummary[] =
    discoveryPage.data;

  TestValidator.predicate(
    "discovery data has at least one admin",
    baselineAdmins.length > 0,
  );

  const targetForSearch: IShoppingMallPlatformAdmin.ISummary =
    baselineAdmins[0];

  // Derive a search keyword from the target email local part
  const atIndex = targetForSearch.email.indexOf("@");
  const localPart =
    atIndex > 0
      ? targetForSearch.email.substring(0, atIndex)
      : targetForSearch.email;
  const searchKeyword =
    localPart.length > 4 ? localPart.substring(0, 4) : localPart;

  // Use the status value from the target summary as our filter
  const statusFilter: string = targetForSearch.status;

  // 5. Act – perform filtered search with pagination
  const filterRequestBody = {
    page: 1 as number,
    limit: 10 as number,
    search: searchKeyword,
    status: statusFilter,
  } satisfies IShoppingMallPlatformAdmin.IRequest;

  const filteredPage: IPageIShoppingMallPlatformadmin.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.index(
      connection,
      {
        body: filterRequestBody,
      },
    );
  typia.assert(filteredPage);

  const pagination: IPage.IPagination = filteredPage.pagination;

  // 6. Assert – pagination coherence
  TestValidator.predicate(
    "filtered pagination current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered pagination limit is positive",
    pagination.limit > 0,
  );
  TestValidator.predicate(
    "filtered records is at least data length",
    pagination.records >= filteredPage.data.length,
  );
  TestValidator.predicate(
    "filtered pages is non-negative",
    pagination.pages >= 0,
  );

  // 7. Assert – data records respect search and status filters
  const filteredAdmins: IShoppingMallPlatformAdmin.ISummary[] =
    filteredPage.data;

  TestValidator.predicate(
    "filtered search returns at least one admin",
    filteredAdmins.length > 0,
  );

  for (const admin of filteredAdmins) {
    // Core field presence is already guaranteed by typia, but we can add
    // business rule checks on values.

    TestValidator.predicate("admin id is non-empty", admin.id.length > 0);
    TestValidator.predicate("admin name is non-empty", admin.name.length > 0);
    TestValidator.predicate("admin email is non-empty", admin.email.length > 0);
    TestValidator.predicate(
      "admin status matches filter",
      admin.status === statusFilter,
    );

    const matchesEmail = admin.email.includes(searchKeyword);
    const matchesName = admin.name.includes(searchKeyword);
    TestValidator.predicate(
      "admin matches search keyword in email or name",
      matchesEmail || matchesName,
    );
  }
}
