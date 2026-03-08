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

export async function test_api_seller_login_banned_account_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  const sellerJoinResponse =
    await api.functional.ecommerceMall.auth.seller.join(connection, {
      body: sellerCredentials,
    });
  typia.assert(sellerJoinResponse);
  const sellerId = sellerJoinResponse.id;
  // 2. Create and login as admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  await api.functional.ecommerceMall.auth.admin.join(connection, {
    body: adminCredentials,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Ban the seller
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const banResponse = await api.functional.ecommerceMall.admin.sellers.ban(
    adminConnection,
    {
      sellerId,
      body: {
        ban_reason: banReason,
      } satisfies IEcommerceMallSeller.IBanRequest,
    },
  );
  typia.assert(banResponse);
  TestValidator.equals("seller is banned", banResponse.is_banned, true);
  // 4. Attempt to login with banned seller credentials - should fail
  await TestValidator.error("banned seller cannot login", async () => {
    await api.functional.ecommerceMall.auth.seller.login(connection, {
      body: {
        email: sellerCredentials.email,
        password: sellerCredentials.password,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  });
}
