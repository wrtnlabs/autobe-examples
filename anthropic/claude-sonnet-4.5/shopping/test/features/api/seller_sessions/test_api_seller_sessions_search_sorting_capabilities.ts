import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test the seller session search API's ability to accept and process sort
 * parameters.
 *
 * Due to API limitations (no login endpoint available, only registration), this
 * test validates that the session search endpoint correctly accepts sort
 * parameter specifications and returns valid responses. The test creates a
 * single seller session through registration and verifies the API can handle
 * various sort parameter formats.
 *
 * Validation points:
 *
 * 1. API accepts ascending sort specification ('+created_at')
 * 2. API accepts descending sort specification ('-created_at')
 * 3. API accepts multiple sort criteria
 * 4. API handles requests without sort parameters (default behavior)
 * 5. Response structure is valid for all sort parameter variations
 *
 * Note: This test validates sort parameter acceptance rather than actual
 * sorting behavior, as creating multiple sessions for full sorting validation
 * requires a login endpoint which is not available in the current API
 * specification.
 */
export async function test_api_seller_sessions_search_sorting_capabilities(
  connection: api.IConnection,
) {
  // Step 1: Create seller account which establishes an authenticated session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Query sessions with ascending sort by created_at
  const sortedAscending: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort: ["+created_at"],
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sortedAscending);

  TestValidator.predicate(
    "ascending sort returns valid response with sessions",
    sortedAscending.data.length > 0,
  );

  // Step 3: Query sessions with descending sort by created_at
  const sortedDescending: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort: ["-created_at"],
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(sortedDescending);

  TestValidator.predicate(
    "descending sort returns valid response with sessions",
    sortedDescending.data.length > 0,
  );

  // Step 4: Query sessions with multiple sort criteria
  const multiSort: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {
          sort: ["+ip", "-created_at"],
        } satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(multiSort);

  TestValidator.predicate(
    "multiple sort criteria returns valid response",
    multiSort.data.length > 0,
  );

  // Step 5: Query sessions without sort parameters (default behavior)
  const defaultSort: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.seller.sellers.sessions.index(
      connection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallSellerSession.IRequest,
      },
    );
  typia.assert(defaultSort);

  TestValidator.predicate(
    "default sort behavior returns valid response",
    defaultSort.data.length > 0,
  );

  // Step 6: Verify all responses contain the same session (only one exists)
  TestValidator.equals(
    "all sort variations return the same session count",
    sortedAscending.data.length,
    sortedDescending.data.length,
  );

  TestValidator.equals(
    "session exists in all responses",
    sortedAscending.data[0].id,
    sortedDescending.data[0].id,
  );
}
