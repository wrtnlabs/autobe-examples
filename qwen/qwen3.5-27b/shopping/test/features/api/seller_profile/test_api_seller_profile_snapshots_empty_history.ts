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
 * Test that a seller with no profile modifications receives an empty paginated result.
 *
 * Validates that the seller profile snapshots endpoint correctly handles the edge case where a newly registered seller has never modified their profile. Ensures the API returns an empty paginated result with proper metadata rather than throwing an error.
 *
 * This test verifies that:
 * - The endpoint is accessible immediately after seller registration
 * - Empty snapshot history is represented correctly with pagination metadata
 * - The response structure is valid even with zero records
 *
 * 1. Register a new seller account with randomized credentials
 * 2. Do not perform any profile updates (ensuring no snapshots exist)
 * 3. Request seller profile snapshots with empty filter criteria
 * 4. Validate response structure and pagination metadata for empty result
 */
export async function test_api_seller_profile_snapshots_empty_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Request profile snapshots (no modifications made, so empty result expected)
  const snapshots =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", snapshots.data.length, 0);
  // 4. Validate pagination metadata for empty result
  TestValidator.equals("records count is 0", snapshots.pagination.records, 0);
  TestValidator.equals("pages count is 0", snapshots.pagination.pages, 0);
  TestValidator.equals("limit is preserved", snapshots.pagination.limit, 20);
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
}
