import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRegion";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";

/**
 * Validate listing regions when the parent countryCode does not exist.
 *
 * Business context:
 *
 * - Public clients may call the regions listing endpoint with arbitrary country
 *   codes, including values that do not correspond to any configured country in
 *   `shopping_mall_countries`.
 * - The platform must behave predictably in this case without leaking internal
 *   errors and while honoring its pagination contract.
 *
 * Test process:
 *
 * 1. Use the provided (public) connection without any authentication flow.
 * 2. Call PATCH /shoppingMall/countries/{countryCode}/regions with an obviously
 *    non-existent country code like "NO_SUCH_COUNTRY_456".
 * 3. Provide a minimal IShoppingMallRegion.IRequest body with page=1 and a
 *    reasonable limit (e.g., 10), leaving other filters undefined so that
 *    backend defaults apply.
 * 4. Assert that the call succeeds and returns a value conforming to
 *    IPageIShoppingMallRegion.ISummary using typia.assert(). This validates
 *    that the SDK and backend handle the request shape correctly even for an
 *    unknown country code.
 * 5. Validate basic pagination invariants:
 *
 *    - Pagination.current equals the requested page.
 *    - Pagination.limit equals the requested limit.
 *    - Pagination.records is greater than or equal to data.length.
 * 6. By using a clearly fake countryCode, this test ensures that public consumers
 *    can safely call the endpoint with arbitrary country codes without
 *    triggering unexpected internal errors, even though we do not assert a
 *    specific 404 vs empty-page behavior.
 */
export async function test_api_public_country_region_list_unknown_country(
  connection: api.IConnection,
) {
  const countryCode = "NO_SUCH_COUNTRY_456";

  const page = 1 satisfies number;
  const limit = 10 satisfies number;

  const requestBody = {
    page,
    limit,
  } satisfies IShoppingMallRegion.IRequest;

  const output: IPageIShoppingMallRegion.ISummary =
    await api.functional.shoppingMall.countries.regions.index(connection, {
      countryCode,
      body: requestBody,
    });

  typia.assert<IPageIShoppingMallRegion.ISummary>(output);

  const pagination = output.pagination;

  TestValidator.equals(
    "pagination.current should match requested page for unknown country",
    pagination.current,
    page,
  );

  TestValidator.equals(
    "pagination.limit should match requested limit for unknown country",
    pagination.limit,
    limit,
  );

  TestValidator.predicate(
    "pagination.records should be >= data.length for unknown country",
    pagination.records >= output.data.length,
  );
}
