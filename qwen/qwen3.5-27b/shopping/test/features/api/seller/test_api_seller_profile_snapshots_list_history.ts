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
 * Test that an authenticated seller can retrieve their complete profile modification history.
 *
 * Validates the seller profile snapshot listing endpoint response structure, pagination metadata, and snapshot data format. Each snapshot captures before and after values for modified profile fields (shop_name, shop_description, logo_image) with the sellerProfile relation included for context.
 *
 * Snapshots are ordered by creation date with the most recent changes appearing first. The test verifies that pagination metadata (current page, limit, total records, total pages) is correctly calculated and returned.
 *
 * Note: This test focuses on the snapshot listing functionality. Snapshot creation requires seller profile update operations which are not available in the current SDK. The test validates the response structure assuming snapshots may exist from previous operations.
 *
 * 1. Register a new seller account via /auth/seller/join using authorize_seller_join utility
 * 2. Call PATCH /shoppingMall/seller/profile/snapshots with empty request body (no filters)
 * 3. Verify the response contains pagination metadata (current, limit, records, pages)
 * 4. Verify the response contains a data array of snapshots
 * 5. If snapshots exist, verify each snapshot has before/after fields for all profile fields
 * 6. Verify snapshots are ordered by created_at descending (most recent first)
 * 7. Verify each snapshot includes sellerProfile relation with summary information
 */
export async function test_api_seller_profile_snapshots_list_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Call snapshot listing endpoint with empty request body
  const response =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {} satisfies IShoppingMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify pagination metadata values are valid
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate("data array exists", response.data !== undefined);
  // 5. If snapshots exist, validate their business logic
  if (response.data.length > 0) {
    // Verify each snapshot structure is valid (typia.assert already validates types)
    for (const snapshot of response.data) {
      typia.assert(snapshot);
      typia.assert(snapshot.sellerProfile);
      // Verify at least one field was changed (either before or after is non-null)
      const hasShopNameChange =
        snapshot.shop_name_before !== null || snapshot.shop_name_after !== null;
      const hasShopDescriptionChange =
        snapshot.shop_description_before !== null ||
        snapshot.shop_description_after !== null;
      const hasLogoImageChange =
        snapshot.logo_image_before !== null ||
        snapshot.logo_image_after !== null;
      TestValidator.predicate(
        `snapshot has at least one field changed: ${snapshot.id}`,
        hasShopNameChange || hasShopDescriptionChange || hasLogoImageChange,
      );
    }
    // 6. Verify snapshots are ordered by created_at descending (most recent first)
    for (let i = 1; i < response.data.length; i++) {
      const previous = response.data[i - 1];
      const current = response.data[i];
      TestValidator.predicate(
        `snapshots ordered by created_at descending (index ${i})`,
        new Date(previous.created_at).getTime() >=
          new Date(current.created_at).getTime(),
      );
    }
  }
}
