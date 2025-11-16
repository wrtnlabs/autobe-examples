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
 * Validate that public brand search is accessible without authentication and
 * returns stable, safe brand summary data.
 *
 * Business goals:
 *
 * - Ensure a platform admin can create a brand that will be visible via the
 *   public brand search endpoint.
 * - Confirm that PATCH /shoppingMall/brands can be called with no Authorization
 *   header (public access) and still returns a valid, paginated list of brand
 *   summaries.
 * - Verify that the response is stable and idempotent for the same request
 *   parameters.
 *
 * Test steps:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join.
 * 2. As that platform admin, create a brand via POST
 *    /shoppingMall/platformAdmin/brands.
 * 3. Construct an unauthenticated connection (no headers) to simulate a public
 *    user.
 * 4. Call PATCH /shoppingMall/brands with a simple IShoppingMallBrand.IRequest
 *    body (page 0, limit 10, no filters).
 * 5. Validate that the response conforms to IPageIShoppingMallBrand.ISummary using
 *    typia.assert, and that it includes the created brand in data.
 * 6. Call the public search endpoint again with the same request body and assert
 *    that pagination metadata and key brand summary fields are consistent
 *    across calls (idempotency and stability).
 */
export async function test_api_brand_search_public_access_and_stability(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain admin privileges
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new brand as the platform admin
  const brandCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_uri:
      "https://cdn.example.com/logo/" + RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallBrand.ICreate;

  const createdBrand: IShoppingMallBrand =
    await api.functional.shoppingMall.platformAdmin.brands.create(connection, {
      body: brandCreateBody,
    });
  typia.assert<IShoppingMallBrand>(createdBrand);

  // 3. Build an unauthenticated connection (no headers) for public access
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Prepare a simple search request body for public brand search
  const searchRequestBody = {
    page: 0,
    limit: 10,
  } satisfies IShoppingMallBrand.IRequest;

  // 5. Call PATCH /shoppingMall/brands without authentication
  const firstPage: IPageIShoppingMallBrand.ISummary =
    await api.functional.shoppingMall.brands.index(publicConnection, {
      body: searchRequestBody,
    });
  typia.assert<IPageIShoppingMallBrand.ISummary>(firstPage);

  // Basic pagination validations
  TestValidator.equals(
    "pagination current page should match request page",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );

  // Ensure at least one brand is returned (we expect ours to appear)
  TestValidator.predicate(
    "public brand search should return at least one brand",
    firstPage.data.length >= 1,
  );

  // Find the created brand in the first page data (by id or slug)
  const foundSummary = firstPage.data.find(
    (summary) =>
      summary.id === createdBrand.id || summary.slug === createdBrand.slug,
  );

  TestValidator.predicate(
    "created brand should be present in public brand search results",
    foundSummary !== undefined,
  );

  if (foundSummary !== undefined) {
    // Validate that key summary fields align with the created brand
    TestValidator.equals(
      "summary id should match created brand id",
      foundSummary.id,
      createdBrand.id,
    );
    TestValidator.equals(
      "summary name should match created brand name",
      foundSummary.name,
      createdBrand.name,
    );
    TestValidator.equals(
      "summary slug should match created brand slug",
      foundSummary.slug,
      createdBrand.slug,
    );
    if (createdBrand.logo_uri !== undefined) {
      TestValidator.equals(
        "summary logo_url should reflect created brand logo_uri when present",
        foundSummary.logo_url,
        createdBrand.logo_uri,
      );
    }
  }

  // 6. Validate idempotency by calling the same search again and comparing
  const secondPage: IPageIShoppingMallBrand.ISummary =
    await api.functional.shoppingMall.brands.index(publicConnection, {
      body: searchRequestBody,
    });
  typia.assert<IPageIShoppingMallBrand.ISummary>(secondPage);

  // Pagination metadata should be stable
  TestValidator.equals(
    "idempotent search: pagination should be stable across calls",
    secondPage.pagination,
    firstPage.pagination,
  );

  // Ensure the created brand is still present in the second call
  const foundSummarySecond = secondPage.data.find(
    (summary) =>
      summary.id === createdBrand.id || summary.slug === createdBrand.slug,
  );

  TestValidator.predicate(
    "created brand should remain present in repeated public search",
    foundSummarySecond !== undefined,
  );

  if (foundSummary !== undefined && foundSummarySecond !== undefined) {
    // Compare key fields of the summary across calls for stability
    TestValidator.equals(
      "summary id should be stable across repeated calls",
      foundSummarySecond.id,
      foundSummary.id,
    );
    TestValidator.equals(
      "summary name should be stable across repeated calls",
      foundSummarySecond.name,
      foundSummary.name,
    );
    TestValidator.equals(
      "summary slug should be stable across repeated calls",
      foundSummarySecond.slug,
      foundSummary.slug,
    );
    TestValidator.equals(
      "summary logo_url should be stable across repeated calls",
      foundSummarySecond.logo_url,
      foundSummary.logo_url,
    );
  }
}
