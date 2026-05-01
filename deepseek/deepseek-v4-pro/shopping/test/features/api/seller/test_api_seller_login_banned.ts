import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Test that a banned seller is prevented from logging in with a 403 Forbidden response.
 *
 * Validates the ban enforcement mechanism in the seller login flow. When an administrator
 * bans a seller, the seller's banned_at timestamp is set to the current time, and the login
 * endpoint must check that banned_at IS NULL before issuing authentication tokens. Banned
 * sellers must receive a 403 Forbidden response with a ban notification regardless of
 * whether their credentials are correct — no session or JWT tokens must be issued.
 *
 * This test also confirms that the ban operation correctly populates the banned_at field
 * on the seller record, distinguishing a successful ban from a no-op.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. A new seller registers with explicitly captured email and password credentials.
 * 3. The administrator bans the seller, and the banned_at field is verified as non-null.
 * 4. The banned seller attempts login — expects 403 Forbidden with a ban notification.
 */
export async function test_api_seller_login_banned(
  connection: api.IConnection,
): Promise<void> {
  // Prepare seller credentials explicitly so they can be reused for the banned login attempt
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller with known credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(seller);
  // 3. Administrator bans the seller
  const banned = await api.functional.shoppingMall.admin.sellers.ban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(banned);
  TestValidator.predicate(
    "seller banned_at must be populated after ban",
    banned.banned_at !== null,
  );
  // 4. Banned seller attempts login — must receive 403 Forbidden
  await TestValidator.httpError(
    "banned seller login rejected",
    403,
    async () => {
      await api.functional.shoppingMall.auth.seller.login(
        { host: connection.host },
        {
          body: {
            email: sellerEmail,
            password: sellerPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallSeller.ILogin,
        },
      );
    },
  );
}
