import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
 * Test token refresh behavior when seller approval status changes from pending to approved.
 *
 * Validates the complete seller approval workflow including seller registration with pending status, administrator approval, and token refresh after status change. Ensures that the refresh operation validates current account approval status at refresh time, not just the status at initial login time.
 *
 * Special attention is given to verifying that the refresh token remains valid after approval status changes and that the refreshed response reflects the updated approval_status 'approved'.
 *
 * 1. Administrator creates account and logs in to perform approval workflow.
 * 2. Seller registers with credentials, receives tokens with approval_status 'pending'.
 * 3. Administrator approves seller account using PUT /shoppingMall/admin/sellers/{sellerId}.
 * 4. Seller refreshes token using the refresh token from initial registration.
 * 5. Validates refresh response shows approval_status 'approved' and new tokens are valid.
 */
export async function test_api_seller_refresh_after_admin_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "regular" as const,
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // 2. Seller registration - starts with 'pending' approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(sellerJoinResult);
  // Validate initial pending status
  TestValidator.equals(
    "initial approval status is pending",
    sellerJoinResult.approval_status,
    "pending",
  );
  const initialRefreshToken = sellerJoinResult.token.refresh;
  // 3. Administrator approves seller account
  const updatedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerJoinResult.id,
      body: {
        approval_status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);
  // Validate approval status changed to approved
  TestValidator.equals(
    "approval status after admin update",
    updatedSeller.approval_status,
    "approved",
  );
  // 4. Seller refreshes token after approval
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: initialRefreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshResult);
  // 5. Validate refresh response reflects approved status
  TestValidator.equals(
    "refresh response shows approved status",
    refreshResult.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller ID matches after refresh",
    refreshResult.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "email matches after refresh",
    refreshResult.email,
    sellerCredentials.email,
  );
  // Validate token expiration is in the future (business logic, not type)
  TestValidator.predicate(
    "expiration timestamp is in the future",
    new Date(refreshResult.token.expired_at) > new Date(),
  );
}
