import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test the seller suspension workflow by toggling an active seller to suspended state.
 *
 * Validates that when an administrator suspends a seller account, the seller's profile is updated correctly with the suspended flag set to true. The test verifies that the suspension operation properly updates both the seller account and seller profile tables, maintaining data consistency.
 *
 * The test creates an administrator and seller account, then suspends the seller using the administrator endpoint. It validates that the response contains the updated seller profile with the correct suspension status and that other profile fields remain unchanged.
 *
 * 1. Authenticate as an administrator using the join endpoint.
 * 2. Create a seller account (approval status may be pending, approved, or rejected).
 * 3. Call the suspend endpoint with sellerId and request body {suspended: true}.
 * 4. Verify the response returns the updated seller profile with is_suspended=true.
 * 5. Verify that other seller profile fields (shop_name, approval_status, etc.) are preserved.
 */
export async function test_api_seller_suspension_toggle_active_to_suspended(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(seller);
  // Store original profile data for comparison
  const originalApprovalStatus = seller.approval_status;
  const originalShopName = seller.shop_name;
  const originalShopDescription = seller.shop_description;
  // 3. Suspend the seller
  const suspendBody = {
    suspended: true,
  } satisfies IShoppingMallSeller.ISuspendRequest;
  const suspendedProfile =
    await api.functional.shoppingMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: suspendBody,
      },
    );
  typia.assert(suspendedProfile);
  // 4. Verify suspension status in response
  TestValidator.equals(
    "seller is suspended",
    suspendedProfile.is_suspended,
    true,
  );
  // 5. Verify that other profile fields are preserved
  TestValidator.equals(
    "approval status preserved",
    suspendedProfile.approval_status,
    originalApprovalStatus,
  );
  TestValidator.equals(
    "shop name preserved",
    suspendedProfile.shop_name,
    originalShopName,
  );
  TestValidator.equals(
    "shop description preserved",
    suspendedProfile.shop_description,
    originalShopDescription,
  );
  TestValidator.equals("seller not banned", suspendedProfile.is_banned, false);
}
