import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteSeller";

/**
 * Test searching and retrieving a paginated and filtered list of favorite
 * sellers for an authenticated customer.
 *
 * Scenario steps:
 *
 * 1. Register a new customer via the join API to establish an authenticated user
 *    context.
 * 2. Perform favorite sellers search with pagination, ordering, and filtering.
 * 3. Validate that the returned data page matches request criteria.
 * 4. Assert that favorite sellers belong to the authenticated customer.
 *
 * This test ensures secure, accurate, and efficient retrieval of a customer's
 * favorite sellers.
 */
export async function test_api_customer_search_favorite_sellers(
  connection: api.IConnection,
) {
  // 1. Join a new customer and obtain authorization token
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "TestPassword123!",
        full_name: RandomGenerator.name(),
        ip: null,
        href: "https://www.example.com/signup",
        referrer: "https://www.google.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Set up favorite sellers search request with pagination and filtering parameters
  const request = {
    page: 1,
    limit: 10,
    search: RandomGenerator.substring(customer.email),
    order_by: "date_added",
    order_direction: "desc",
  } satisfies IShoppingMallFavoriteSeller.IRequest;

  // 3. Call favorite sellers search endpoint
  const page: IPageIShoppingMallFavoriteSeller.ISummary =
    await api.functional.shoppingMall.customer.shoppingMall.favoriteSellers.index(
      connection,
      { body: request },
    );
  typia.assert(page);

  // 4. Validate pagination info
  TestValidator.predicate(
    "correct current page",
    page.pagination.current === request.page,
  );
  TestValidator.predicate(
    "correct page limit",
    page.pagination.limit === request.limit,
  );
  TestValidator.predicate(
    "total pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records count reasonable",
    page.pagination.records >= 0,
  );

  // 5. Validate favorite sellers data
  TestValidator.predicate(
    "favorite sellers count within limit",
    page.data.length <= request.limit,
  );

  // 6. Validate each favorite seller
  for (const favoriteSeller of page.data) {
    // IDs must be non-empty strings
    TestValidator.predicate(
      "favorite seller ID non-empty",
      typeof favoriteSeller.id === "string" && favoriteSeller.id.length > 0,
    );
    TestValidator.predicate(
      "seller ID non-empty",
      typeof favoriteSeller.sellerId === "string" &&
        favoriteSeller.sellerId.length > 0,
    );
    TestValidator.predicate(
      "seller name non-empty",
      typeof favoriteSeller.sellerName === "string" &&
        favoriteSeller.sellerName.length > 0,
    );
    // sellerRating must be between 0 and 5
    TestValidator.predicate(
      "seller rating within range",
      favoriteSeller.sellerRating >= 0 && favoriteSeller.sellerRating <= 5,
    );
    // addedAt must be ISO date string
    TestValidator.predicate(
      "valid addedAt format",
      typeof favoriteSeller.addedAt === "string" &&
        !isNaN(Date.parse(favoriteSeller.addedAt)),
    );
  }
}
