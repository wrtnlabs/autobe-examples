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
 * Test token refresh failure when seller account is suspended after token issuance.
 *
 * This test validates the business rule that account suspension immediately invalidates
 * existing sessions and prevents token refresh. The flow is:
 * 1. Seller registers and obtains authentication tokens
 * 2. Admin suspends the seller account
 * 3. Seller attempts to refresh token - should fail due to suspension
 *
 * This ensures suspended sellers cannot maintain active sessions and must resolve
 * the suspension before being able to authenticate again.
 */
export async function test_api_seller_token_refresh_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and obtain tokens
  const sellerAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create admin account for suspension operation
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Admin suspends the seller account
  await api.functional.shoppingMall.admin.admin.sellers.suspend(
    {
      host: connection.host,
      headers: { Authorization: adminAuth.token.access },
    },
    {
      sellerId: sellerAuth.id,
    },
  );
  // 4. Attempt to refresh seller token - should fail due to suspension
  await TestValidator.error(
    "suspended seller cannot refresh token",
    async () => {
      await authorize_seller_refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: sellerAuth.token.refresh,
          } satisfies IShoppingMallSeller.IRefresh,
        },
      );
    },
  );
}
