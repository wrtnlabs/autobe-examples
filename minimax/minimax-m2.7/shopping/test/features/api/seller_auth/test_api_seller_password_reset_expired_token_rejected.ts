import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function test_api_seller_password_reset_expired_token_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: RandomGenerator.pick(["customer", "seller"] as const),
      requestedGrade: RandomGenerator.pick(["admin", "super_admin"] as const),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Admin login with captured credentials
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResult);
  // 4. Attempt password reset with expired/invalid token
  const expiredToken = RandomGenerator.alphabets(32);
  await TestValidator.error("expired token rejected", async () => {
    await api.functional.ecommerceMall.admin.sellers.password_resets.reset(
      adminConnection,
      {
        sellerId: sellerResult.id,
        body: {
          token: expiredToken,
          newPassword: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallSellerPasswordReset.IReset,
      },
    );
  });
  // 5. Verify seller can still login with original password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await api.functional.ecommerceMall.auth.seller.login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLogin);
  TestValidator.equals(
    "seller can still login with original password",
    sellerLogin.email,
    sellerEmail,
  );
}
