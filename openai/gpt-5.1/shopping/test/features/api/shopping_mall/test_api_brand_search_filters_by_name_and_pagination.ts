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
 * Brand search filters by name and pagination.
 *
 * Business goal
 *
 * - Ensure that the public brand search endpoint (PATCH /shoppingMall/brands)
 *   correctly filters brands based on a free-text search term across brand
 *   names and slugs, and that pagination metadata and slicing are consistent
 *   with the number of matches.
 *
 * High level scenario
 *
 * 1. Join a platform administrator using POST /auth/platformAdmin/join so that we
 *    can create brands via the admin-only endpoint.
 * 2. Using this admin context, create three brands through POST
 *    /shoppingMall/platformAdmin/brands:
 *
 *    - "Alpha Brand" with slug "alpha-brand" and a logo_uri
 *    - "Alpha Premium" with slug "alpha-premium" and a logo_uri
 *    - "Beta Brand" with slug "beta-brand" and a logo_uri
 * 3. Call PATCH /shoppingMall/brands with body { search: "Alpha", page: 0, limit:
 *    1 } so that only the first matching brand is returned.
 * 4. Call PATCH /shoppingMall/brands again with the same search term and body {
 *    search: "Alpha", page: 1, limit: 1 } so that the second matching brand is
 *    returned.
 *
 * Validations
 *
 * - The total number of matching records in `pagination.records` must be 2, and
 *   `pagination.pages` must be consistent with `limit` and `records`.
 * - Page 0 (first call) returns exactly one brand whose name or slug contains the
 *   substring "Alpha", and it must be one of the two created Alpha brands.
 * - Page 1 (second call) returns the other Alpha brand, with no overlap in IDs
 *   between page 0 and page 1.
 * - Neither page 0 nor page 1 contain the non-matching brand ("Beta Brand").
 * - Every returned item satisfies IShoppingMallBrand.ISummary via typia.assert.
 * - For brands where we provided logo_uri on creation, the ISummary.logo_url
 *   should be present and equal to the original logo_uri value.
 */
export async function test_api_brand_search_filters_by_name_and_pagination(
  connection: api.IConnection,
) {
  // 1. Join a platform administrator so we can create brands.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://landing.shoppingmall.test/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create three brands via platformAdmin endpoint.
  const alpha1Create = {
    name: "Alpha Brand",
    slug: `alpha-brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/alpha-brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const alpha2Create = {
    name: "Alpha Premium",
    slug: `alpha-premium-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/alpha-premium.png",
  } satisfies IShoppingMallBrand.ICreate;

  const betaCreate = {
    name: "Beta Brand",
    slug: `beta-brand-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    logo_uri: "https://cdn.shoppingmall.test/logos/beta-brand.png",
  } satisfies IShoppingMallBrand.ICreate;

  const alpha1: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: alpha1Create,
    });
  typia.assert(alpha1);

  const alpha2: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: alpha2Create,
    });
  typia.assert(alpha2);

  const beta: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: betaCreate,
    });
  typia.assert(beta);

  // Helper: ensure these three are distinct IDs just for sanity.
  TestValidator.notEquals("alpha1 and alpha2 ids differ", alpha1.id, alpha2.id);
  TestValidator.notEquals("alpha1 and beta ids differ", alpha1.id, beta.id);
  TestValidator.notEquals("alpha2 and beta ids differ", alpha2.id, beta.id);

  const searchTerm = "Alpha";
  const limit = 1 as number;

  const requestPage0 = {
    search: searchTerm,
    page: 0,
    limit,
  } satisfies IShoppingMallBrand.IRequest;

  const page0: IPageIShoppingMallBrand.ISummary =
    await api.functional.shoppingMall.brands.index(connection, {
      body: requestPage0,
    });
  typia.assert(page0);

  // Basic pagination assertions for page 0.
  const pagination0 = page0.pagination;
  TestValidator.equals("page0 current is 0", pagination0.current, 0);
  TestValidator.equals(
    "page0 limit is requested limit",
    pagination0.limit,
    limit,
  );
  TestValidator.equals(
    "total records should be 2 for alpha matches",
    pagination0.records,
    2,
  );

  // With 2 records and limit 1, pages should be 2.
  TestValidator.equals("pages should be 2", pagination0.pages, 2);

  // Page 0 should have exactly one item.
  TestValidator.equals("page0 data length is 1", page0.data.length, 1);

  const brand0 = page0.data[0];
  typia.assert<IShoppingMallBrand.ISummary>(brand0);

  // brand0 must be either alpha1 or alpha2 and never beta.
  TestValidator.predicate(
    "page0 brand is an Alpha brand",
    brand0.id === alpha1.id || brand0.id === alpha2.id,
  );
  TestValidator.notEquals("page0 brand is not beta", brand0.id, beta.id);

  // If logo_url is present, it should match the created logo_uri for the brand.
  if (brand0.id === alpha1.id && alpha1.logo_uri !== undefined) {
    TestValidator.equals(
      "page0 alpha1 logo_url matches logo_uri",
      brand0.logo_url,
      alpha1.logo_uri,
    );
  } else if (brand0.id === alpha2.id && alpha2.logo_uri !== undefined) {
    TestValidator.equals(
      "page0 alpha2 logo_url matches logo_uri",
      brand0.logo_url,
      alpha2.logo_uri,
    );
  }

  // 4. Request page 1 with the same search term and limit.
  const requestPage1 = {
    search: searchTerm,
    page: 1,
    limit,
  } satisfies IShoppingMallBrand.IRequest;

  const page1: IPageIShoppingMallBrand.ISummary =
    await api.functional.shoppingMall.brands.index(connection, {
      body: requestPage1,
    });
  typia.assert(page1);

  const pagination1 = page1.pagination;
  TestValidator.equals("page1 current is 1", pagination1.current, 1);
  TestValidator.equals(
    "page1 limit is requested limit",
    pagination1.limit,
    limit,
  );
  TestValidator.equals(
    "page1 total records still 2",
    pagination1.records,
    pagination0.records,
  );
  TestValidator.equals(
    "page1 pages still 2",
    pagination1.pages,
    pagination0.pages,
  );

  // Page 1 should also have at least one item (the second alpha brand).
  TestValidator.equals("page1 data length is 1", page1.data.length, 1);

  const brand1 = page1.data[0];
  typia.assert<IShoppingMallBrand.ISummary>(brand1);

  TestValidator.predicate(
    "page1 brand is an Alpha brand",
    brand1.id === alpha1.id || brand1.id === alpha2.id,
  );
  TestValidator.notEquals("page1 brand is not beta", brand1.id, beta.id);

  // Ensure that page0 and page1 are non-overlapping in terms of IDs.
  TestValidator.notEquals(
    "page0 and page1 brand IDs are different",
    brand0.id,
    brand1.id,
  );

  // Check logo_url consistency on page1 as well.
  if (brand1.id === alpha1.id && alpha1.logo_uri !== undefined) {
    TestValidator.equals(
      "page1 alpha1 logo_url matches logo_uri",
      brand1.logo_url,
      alpha1.logo_uri,
    );
  } else if (brand1.id === alpha2.id && alpha2.logo_uri !== undefined) {
    TestValidator.equals(
      "page1 alpha2 logo_url matches logo_uri",
      brand1.logo_url,
      alpha2.logo_uri,
    );
  }
}
