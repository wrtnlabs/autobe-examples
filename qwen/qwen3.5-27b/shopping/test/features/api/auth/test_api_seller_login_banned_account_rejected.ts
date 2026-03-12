import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
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
 * Test that sellers with banned accounts cannot login to the platform.
 *
 * This test validates the security mechanism that prevents banned sellers from
 * accessing the platform. The test follows this workflow:
 * 1. Register a new seller account
 * 2. Register and login as admin
 * 3. Ban the seller account (approval status is not required for ban operation)
 * 4. Attempt to login as the banned seller (should fail with 401)
 */
export async function test_api_seller_login_banned_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoinResult);
  // 2. Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Ban the seller account using admin endpoint
  // Note: The ban operation works regardless of the seller's approval status.
  // In a complete workflow, the seller would first be approved, but the ban
  // mechanism is independent of approval status.
  const sellerId: string & tags.Format<"uuid"> = sellerJoinResult.id;
  const bannedSeller = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(bannedSeller);
  // Verify the seller is now banned
  TestValidator.equals(
    "seller status is banned",
    bannedSeller.status,
    "banned",
  );
  // 4. Attempt to login as the banned seller (should fail with 401)
  const bannedSellerLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.httpError(
    "banned seller login should be rejected with 401",
    401,
    async () => {
      await authorize_seller_login(bannedSellerLoginConnection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
