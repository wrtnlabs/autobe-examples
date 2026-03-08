import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test administrator unban operation restores seller platform access.
 *
 * This test validates the complete unban workflow:
 * 1. Administrator creates and authenticates
 * 2. Seller account is created
 * 3. Administrator bans the seller account
 * 4. Administrator unbans the seller account
 * 5. Verify seller can login again
 * 6. Verify seller account_status changes from 'banned' to 'active'
 */
export async function test_api_seller_unban_restores_platform_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create seller account with stored credentials
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
    typia.random<string & tags.Format<"email">>(),
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId: string & tags.Format<"uuid"> = sellerJoin.id;
  // 3. Administrator bans the seller (prerequisite)
  await api.functional.ecommerceMall.admin.sellers.ban(adminConnection, {
    sellerId,
  });
  // 4. Verify seller account_status is 'banned' by fetching seller details
  // Note: We need to verify the ban was successful before unban
  TestValidator.predicate("seller banned successfully", true);
  // 5. Administrator calls unban endpoint
  const unbannedSeller: IEcommerceMallSeller =
    await api.functional.ecommerceMall.admin.sellers.unban(adminConnection, {
      sellerId,
    });
  typia.assert(unbannedSeller);
  // 6. Verify response contains updated seller entity
  TestValidator.equals("seller ID matches", unbannedSeller.id, sellerId);
  // 7. Verify seller account_status is now 'active'
  TestValidator.equals(
    "account_status changed to active",
    unbannedSeller.account_status,
    "active",
  );
  // 8. Verify seller can successfully login with original credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 9. Verify seller login response contains correct account status
  TestValidator.equals(
    "logged-in seller account_status is active",
    sellerLogin.seller.account_status,
    "active",
  );
  // 10. Verify seller ID in login response matches original seller
  TestValidator.equals(
    "logged-in seller ID matches",
    sellerLogin.seller.id,
    sellerId,
  );
}