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

export async function test_api_seller_login_approved(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  // Step 2: Create seller account (will have pending approval status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: shopName,
    },
  });
  typia.assert(sellerJoinResult);
  // Step 3: Create admin account and connection for approval
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  // Step 4: Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoinResult.id,
    });
  typia.assert(approvedSeller);
  // Step 5: Seller login with approved status
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResult);
  // Step 6: Validate seller profile information
  TestValidator.equals(
    "approval status",
    loginResult.approvalStatus,
    "approved",
  );
  TestValidator.equals("seller email matches", loginResult.email, sellerEmail);
  TestValidator.equals("shop name matches", loginResult.shopName, shopName);
  TestValidator.equals(
    "seller ID matches",
    loginResult.id,
    sellerJoinResult.id,
  );
  // Step 7: Validate tokens exist
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  // Step 8: Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  // Access token should expire in 15-30 minutes (900-1800 seconds)
  const accessExpiresInSeconds = (expiredAt.getTime() - now.getTime()) / 1000;
  TestValidator.predicate(
    "access token expires in 15-30 minutes",
    accessExpiresInSeconds >= 900 && accessExpiresInSeconds <= 1800,
  );
  // Refresh token should be valid for 7-30 days
  const refreshExpiresInSeconds =
    (refreshableUntil.getTime() - now.getTime()) / 1000;
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
  TestValidator.predicate(
    "refresh token valid for 7-30 days",
    refreshExpiresInSeconds >= sevenDaysInSeconds &&
      refreshExpiresInSeconds <= thirtyDaysInSeconds,
  );
}
