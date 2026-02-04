import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test complete seller onboarding workflow: registration with 'pending' status → admin approval → successful login with 'approved' status.
 *
 * This test validates that the seller account is properly created with 'pending' status, then approved by an admin, and finally the seller can successfully login after approval.
 *
 * Steps:
 * 1. Register a new seller with 'pending' status
 * 2. Authenticate as admin
 * 3. Approve the seller account
 * 4. Verify seller can login (status: 'approved')
 */
export async function test_api_seller_login_with_approved_account(
  connection: api.IConnection,
) {
  // 1. Register a new seller with 'pending' status
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: "password123",
        ip: "192.168.0.1",
        href: "https://example.com",
        referrer: "https://example.com/login",
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  // Validate seller status is 'pending' (should be after registration)
  TestValidator.equals(
    "seller status after registration",
    seller.status,
    "pending",
  );
  // 2. Authenticate as admin (create admin connection)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  // 3. Approve the seller account using admin connection
  await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Now try to login as seller (should succeed with 'approved' status)
  const validatedSeller: IShoppingMallSeller.IAuthorized =
    await authorize_seller_login(sellerConnection, {
      body: {
        email: sellerEmail,
        password: "password123",
        ip: "192.168.0.1",
        href: "https://example.com",
        referrer: "https://example.com/login",
      } satisfies IShoppingMallSeller.ILogin,
    });
  // Validate seller status is now 'approved'
  TestValidator.equals(
    "seller status after approval",
    validatedSeller.status,
    "approved",
  );
}
