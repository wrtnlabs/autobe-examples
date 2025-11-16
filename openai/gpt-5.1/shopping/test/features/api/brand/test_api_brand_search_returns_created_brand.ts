import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBrand";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Ensure that brands created by a platform administrator are discoverable
 * through the public brand search endpoint with correct pagination metadata.
 *
 * Business workflow:
 *
 * 1. Register a platform administrator through POST /auth/platformAdmin/join.
 * 2. As that admin, create a new brand via POST
 *    /shoppingMall/platformAdmin/brands.
 * 3. Call PATCH /shoppingMall/brands with a search request that should match the
 *    created brand by name/slug.
 * 4. Verify that the created brand appears in the search results summary and that
 *    pagination metadata is consistent with the expected record count and
 *    requested limit.
 *
 * The search endpoint itself is public; however, the join call will mutate the
 * shared connection headers by setting an Authorization token. This test
 * therefore uses a cloned connection with empty headers for the public search
 * step so that it does not rely on admin authentication for read access.
 */
export async function test_api_brand_search_returns_created_brand(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new brand as the platform admin
  const uniqueSlug = `brand-${RandomGenerator.alphaNumeric(8)}`;
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: uniqueSlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.shoppingmall.example.com/logos/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert(createdBrand);

  // Basic validation of creation output
  TestValidator.equals(
    "created brand slug should match creation payload",
    createdBrand.slug,
    brandCreateBody.slug,
  );
  TestValidator.equals(
    "created brand name should match creation payload",
    createdBrand.name,
    brandCreateBody.name,
  );
  TestValidator.equals(
    "created brand logo_uri should match creation payload",
    createdBrand.logo_uri,
    brandCreateBody.logo_uri,
  );

  // 3. Call PATCH /shoppingMall/brands (public search) using a fresh
  //    connection without Authorization headers, to reflect that the
  //    endpoint does not require authentication.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const pageIndex: number & tags.Type<"int32"> = 0 as number &
    tags.Type<"int32">;
  const pageLimit: number & tags.Type<"int32"> = 10 as number &
    tags.Type<"int32">;

  const searchRequestBody = {
    page: pageIndex,
    limit: pageLimit,
    search: createdBrand.name,
    isActive: undefined,
    regionCode: undefined,
    sortBy: "name" as const,
    sortDirection: "asc" as const,
  } satisfies IShoppingMallBrand.IRequest;

  const pageResult: IPageIShoppingMallBrand.ISummary =
    await api.functional.shoppingMall.brands.index(publicConnection, {
      body: searchRequestBody,
    });
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 4. Validate that pagination metadata is consistent
  TestValidator.predicate(
    "pagination.limit should match requested limit (or be capped but positive)",
    () => pagination.limit > 0 && pagination.limit <= pageLimit,
  );

  TestValidator.predicate(
    "pagination.current should be non-negative and within total pages",
    () =>
      pagination.current >= 0 &&
      (pagination.pages === 0 || pagination.current < pagination.pages),
  );

  TestValidator.predicate(
    "pagination.records should be non-negative",
    () => pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination.pages should be non-negative",
    () => pagination.pages >= 0,
  );

  // Find our created brand in the search results
  const foundSummary: IShoppingMallBrand.ISummary | undefined =
    pageResult.data.find((brand) => brand.id === createdBrand.id);

  TestValidator.predicate(
    "created brand should appear in search results",
    foundSummary !== undefined,
  );

  if (!foundSummary) return;

  // Validate summary fields against the created brand
  TestValidator.equals(
    "summary id matches created brand id",
    foundSummary.id,
    createdBrand.id,
  );
  TestValidator.equals(
    "summary name matches created brand name",
    foundSummary.name,
    createdBrand.name,
  );
  TestValidator.equals(
    "summary slug matches created brand slug",
    foundSummary.slug,
    createdBrand.slug,
  );

  // logo_url in summary should correspond to the logo_uri of the created brand
  TestValidator.equals(
    "summary logo_url should be defined when logo_uri was provided",
    foundSummary.logo_url,
    createdBrand.logo_uri,
  );
}
