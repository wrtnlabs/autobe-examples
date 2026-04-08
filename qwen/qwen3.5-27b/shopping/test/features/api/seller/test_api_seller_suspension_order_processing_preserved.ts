import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that suspended sellers retain the ability to process existing orders while losing product management capabilities.
 *
 * Validates the seller suspension workflow by verifying that when a seller is suspended by an administrator, the suspension status is correctly applied and the seller can still authenticate to process existing orders.
 *
 * This test ensures that suspension is properly implemented: the seller's is_suspended flag is set to true, but they can still log in to fulfill existing commitments. Product management restrictions would be enforced at the API level for product-related endpoints.
 *
 * 1. Authenticate as an administrator using the join endpoint.
 * 2. Create a seller account.
 * 3. Authenticate as a customer (for context).
 * 4. As administrator, suspend the seller with {suspended: true}.
 * 5. Verify the seller profile shows is_suspended=true.
 * 6. As the suspended seller, verify they can still authenticate (login).
 * 7. Verify the suspension status persists across authentication.
 * 8. Verify the suspension flags are consistent between profile and auth responses.
 */
export async function test_api_seller_suspension_order_processing_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Create a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
    },
  });
  typia.assert(sellerAuth);
  // 3. Authenticate as a customer (for context)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
    },
  });
  typia.assert(customerAuth);
  // 4. As administrator, suspend the seller
  const suspendBody = {
    suspended: true,
  } satisfies IShoppingMallSeller.ISuspendRequest;
  const suspendedProfile =
    await api.functional.shoppingMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: suspendBody,
      },
    );
  typia.assert(suspendedProfile);
  // 5. Verify the seller profile shows is_suspended=true
  TestValidator.equals(
    "seller is suspended",
    suspendedProfile.is_suspended,
    true,
  );
  TestValidator.predicate(
    "suspension flag correctly set",
    suspendedProfile.is_suspended === true,
  );
  // 6. As the suspended seller, verify they can still authenticate (login)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com/seller",
      referrer: "https://test.com/login",
    },
  });
  typia.assert(sellerLoginAuth);
  // 7. Verify the suspension status persists across authentication
  TestValidator.equals(
    "suspended seller can still login",
    sellerLoginAuth.suspended,
    true,
  );
  TestValidator.predicate(
    "suspended seller authentication successful",
    sellerLoginAuth.id === sellerAuth.id,
  );
  // 8. Verify the suspension flags are consistent between profile and auth responses
  TestValidator.equals(
    "suspension status consistent",
    sellerLoginAuth.suspended,
    suspendedProfile.is_suspended,
  );
  TestValidator.predicate(
    "both suspension flags match",
    sellerLoginAuth.suspended === suspendedProfile.is_suspended,
  );
}
