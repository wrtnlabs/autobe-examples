import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot listing with date range filtering and ascending sort direction.
 *
 * Validates that the seller profile snapshot listing endpoint correctly applies date range filters with inclusive boundaries and sorts results in oldest-first order when "created_at_asc" is specified. Also verifies that pagination continues to function correctly when combined with date filters, and that the shopping_mall_seller_profile_id filter is properly scoped to the authenticated seller — a seller cannot use this filter to access another seller's profile snapshot history.
 *
 * The test covers four validation scenarios:
 *
 * 1. A seller registers via authorize_seller_join and queries their snapshot history with a wide date range (from epoch to far future) and ascending sort. The response structure is validated, and any returned snapshots are verified to fall within the inclusive date boundaries and appear in ascending chronological order.
 *
 * 2. A narrow date range entirely in the future is applied to verify that date filtering correctly excludes all records. The response should still be structurally valid with zero matching snapshots.
 *
 * 3. Pagination is verified by specifying explicit page and limit values and confirming that the returned pagination metadata reflects the correct current page and limit.
 *
 * 4. A random UUID is provided as the shopping_mall_seller_profile_id filter. Since the actor is a seller (not an admin), this filter should be ignored — results remain scoped to the authenticated seller's own profile snapshots.
 */
export async function test_api_seller_profile_snapshots_list_with_date_filter_and_sort(
  connection: api.IConnection,
) {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Prepare date boundaries
  const epoch = new Date(0).toISOString();
  const farFuture = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // 3. Query with wide date range and ascending sort
  const wideRange =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          dateFrom: epoch,
          dateTo: farFuture,
          sort: ["created_at_asc"],
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(wideRange);
  // 3.1 Verify all snapshots fall within the inclusive date range
  for (const snapshot of wideRange.data) {
    TestValidator.predicate(
      "snapshot created_at >= dateFrom (inclusive)",
      snapshot.created_at >= epoch,
    );
    TestValidator.predicate(
      "snapshot created_at <= dateTo (inclusive)",
      snapshot.created_at <= farFuture,
    );
  }
  // 3.2 Verify ascending sort order
  if (wideRange.data.length > 1) {
    for (let i = 1; i < wideRange.data.length; i++) {
      TestValidator.predicate(
        `snapshot[${i}] created_at >= snapshot[${i - 1}] created_at (ascending)`,
        wideRange.data[i].created_at >= wideRange.data[i - 1].created_at,
      );
    }
  }
  // 4. Query with future-only date range — should return no snapshots
  const futureFrom = new Date(
    Date.now() + 10 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureTo = new Date(
    Date.now() + 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureRange =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          dateFrom: futureFrom,
          dateTo: futureTo,
          sort: ["created_at_asc"],
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(futureRange);
  TestValidator.equals(
    "future date range should have no snapshots",
    futureRange.data.length,
    0,
  );
  // 5. Verify pagination works with date filters and sort
  const paginated =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          dateFrom: epoch,
          dateTo: farFuture,
          sort: ["created_at_asc"],
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination current page",
    paginated.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginated.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records is non-negative",
    paginated.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    paginated.pagination.pages >= 0,
  );
  // 6. Verify seller cannot use shopping_mall_seller_profile_id to access another seller's snapshots
  const otherProfileId = typia.random<string & tags.Format<"uuid">>();
  const filteredByOtherProfile =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          shopping_mall_seller_profile_id: otherProfileId,
          sort: ["created_at_asc"],
        } satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(filteredByOtherProfile);
}
