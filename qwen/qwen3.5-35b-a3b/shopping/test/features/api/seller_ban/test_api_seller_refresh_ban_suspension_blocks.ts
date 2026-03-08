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

export async function test_api_seller_refresh_ban_suspension_blocks(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Setup - Register seller with known password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection1: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAccount);
  // Step 2: Login seller to get refresh token
  const sellerConnection2: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerAccount.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  // Store refresh token before ban
  const refreshToken = sellerLoginResult.token.refresh;
  // Step 3: Setup Admin - Register admin with known password
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Step 4: Login admin
  const adminConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection2, {
    body: {
      email: adminAccount.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Step 5: Admin bans the seller
  await api.functional.ecommerceMall.admin.sellers.ban(adminConnection2, {
    sellerId: sellerAccount.id,
    body: {
      ban_reason: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEcommerceMallSeller.IBanRequest,
  });
  // Step 6: Attempt to refresh token - should fail with 401
  await TestValidator.error("seller refresh after ban fails", async () => {
    await authorize_seller_refresh(sellerConnection2, {
      body: {
        refresh_token: refreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    });
  });
}
