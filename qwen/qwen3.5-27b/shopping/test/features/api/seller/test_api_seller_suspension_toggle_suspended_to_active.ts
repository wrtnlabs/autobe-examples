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
 * Test the complete workflow of unsuspending a previously suspended seller account.
 *
 * Validates that administrators can toggle seller suspension status and that unsuspending restores all seller capabilities including authentication and product management. The test ensures that the suspension toggle mechanism works correctly in both directions and that the seller's profile status is accurately reflected in the system.
 *
 * Special attention is given to verifying that the suspension state change is properly persisted and that the seller can successfully authenticate after being unsuspended, confirming that all restrictions have been lifted.
 *
 * 1. Create and authenticate an administrator account.
 * 2. Create a seller account with email and password.
 * 3. First suspend the seller by calling the suspend endpoint with {suspended: true}.
 * 4. Verify the seller is suspended (is_suspended=true in response).
 * 5. Call the suspend endpoint again with sellerId and {suspended: false} to unsuspend.
 * 6. Verify the response returns the updated seller profile with is_suspended=false.
 * 7. Validate that the seller can successfully authenticate after being unsuspended.
 */
export async function test_api_seller_suspension_toggle_suspended_to_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin_suspension_test@example.com",
      password: "AdminPass123",
    },
  });
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: "seller_suspension_test@example.com",
      password: "SellerPass123",
    },
  });
  typia.assert(sellerAuth);
  const sellerId: string = sellerAuth.id;
  const sellerEmail: string = sellerAuth.email;
  // 3. Suspend the seller first
  const suspendResponse =
    await api.functional.shoppingMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId,
        body: { suspended: true } satisfies IShoppingMallSeller.ISuspendRequest,
      },
    );
  typia.assert(suspendResponse);
  // 4. Verify seller is suspended
  TestValidator.equals(
    "seller is suspended after suspend call",
    suspendResponse.is_suspended,
    true,
  );
  // 5. Unsuspend the seller
  const unsuspendResponse =
    await api.functional.shoppingMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId,
        body: {
          suspended: false,
        } satisfies IShoppingMallSeller.ISuspendRequest,
      },
    );
  typia.assert(unsuspendResponse);
  // 6. Verify seller is unsuspended
  TestValidator.equals(
    "seller is unsuspended after unsuspend call",
    unsuspendResponse.is_suspended,
    false,
  );
  // 7. Verify seller can authenticate after being unsuspended
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: "SellerPass123",
        href: "https://example.com/login",
        referrer: "https://example.com",
      } satisfies IShoppingMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // 8. Verify the authenticated seller has is_suspended=false
  TestValidator.equals(
    "authenticated seller is not suspended",
    sellerLoginResult.suspended,
    false,
  );
}
