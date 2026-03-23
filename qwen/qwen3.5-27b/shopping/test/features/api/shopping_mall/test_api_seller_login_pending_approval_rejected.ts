import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that sellers with pending approval status cannot login to the platform.
 *
 * This test verifies the business rule that sellers must be approved by an
 * administrator before they can authenticate and access seller features.
 * Sellers with approval_status='pending', 'rejected', or 'suspended' should
 * receive a 403 Forbidden error when attempting to login.
 */
export async function test_api_seller_login_pending_approval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new seller account (will have approval_status='pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // Verify the seller was created with pending approval status
  TestValidator.equals(
    "seller approval status is pending",
    registeredSeller.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller account status is active",
    registeredSeller.status,
    "active",
  );
  // 2. Test: Attempt to login with pending seller credentials
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login fails with 403 for pending seller",
    403,
    async () =>
      await api.functional.shoppingMall.auth.seller.login(loginConnection, {
        body: {
          email: registeredSeller.email,
          password: password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.ILogin,
      }),
  );
}
