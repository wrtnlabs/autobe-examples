import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_unban_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and register
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create seller connection and register - capture credentials for later login verification
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Super admin bans the seller as precondition (isBanned = true)
  const bannedSeller = await api.functional.shoppingMall.superAdmin.sellers.ban(
    superAdminConnection,
    { sellerId },
  );
  typia.assert(bannedSeller);
  TestValidator.equals(
    "seller is banned after ban operation",
    bannedSeller.isBanned,
    true,
  );
  // Capture isSuspended state before unban to verify it is not altered by the unban
  const suspendedStateBeforeUnban = bannedSeller.isSuspended;
  // 4. Record timestamp before unban to verify updatedAt is refreshed
  const beforeUnban = new Date().toISOString();
  // 5. Super admin unbans the seller (the primary test target)
  const unbannedSeller =
    await api.functional.shoppingMall.superAdmin.sellers.unban(
      superAdminConnection,
      { sellerId },
    );
  typia.assert(unbannedSeller);
  // 6. Validate unban response
  // isBanned must be false after unban
  TestValidator.equals(
    "seller isBanned is false after unban",
    unbannedSeller.isBanned,
    false,
  );
  // id must match the seller's UUID used in the request
  TestValidator.equals(
    "seller id matches the target sellerId",
    unbannedSeller.id,
    sellerId,
  );
  // updatedAt must be >= beforeUnban timestamp, confirming the record was updated
  TestValidator.predicate(
    "updatedAt is refreshed after unban",
    unbannedSeller.updatedAt >= beforeUnban,
  );
  // deletedAt must remain null (seller account is still active)
  TestValidator.equals(
    "deletedAt remains null after unban",
    unbannedSeller.deletedAt,
    null,
  );
  // isSuspended must remain unchanged — unban operation does not affect suspension state
  TestValidator.equals(
    "isSuspended is not affected by unban",
    unbannedSeller.isSuspended,
    suspendedStateBeforeUnban,
  );
  // 7. Verify the seller can successfully log in again after being unbanned
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(loginResult);
  TestValidator.equals(
    "re-logged in seller id matches",
    loginResult.id,
    sellerId,
  );
  TestValidator.equals(
    "re-logged in seller is not banned",
    loginResult.isBanned,
    false,
  );
}
