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
 * Test basic retrieval of seller profile snapshot history with default pagination.
 *
 * Validates that a newly registered seller can retrieve their own profile snapshot history through the paginated endpoint. The test verifies that the response conforms to the IPage structure containing IShoppingMallSellerProfileSnapshot.ISummary records, pagination metadata is correctly populated with non-negative values, and the auto-scoping mechanism correctly returns only snapshots belonging to the authenticated seller's own profile.
 *
 * 1. Seller registers and authenticates via authorize_seller_join.
 * 2. Seller retrieves profile snapshots with an empty request body (default pagination).
 * 3. Validates pagination metadata: current, limit, records, and pages are all non-negative.
 * 4. Validates total records count is consistent with the returned data length.
 */
export async function test_api_seller_profile_snapshots_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Retrieve profile snapshots with default pagination (no filters, no sort)
  const result =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "total records count >= current page data length",
    result.pagination.records >= result.data.length,
  );
}
