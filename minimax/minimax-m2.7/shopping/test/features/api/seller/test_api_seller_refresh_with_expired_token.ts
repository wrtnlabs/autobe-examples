import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_with_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller account to obtain valid tokens for the test session
  const sellerConnection: api.IConnection = { host: connection.host };
  const registered = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(registered);
  // 2. Attempt to refresh with an expired/invalid refresh token
  // Using a fabricated expired token that would not match any valid session
  await TestValidator.httpError(
    "expired refresh token returns 401 Unauthorized",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.seller.refresh(connection, {
        body: {
          refreshToken: "expired-token-for-testing-purposes-only",
        } satisfies IEcommerceMallSeller.IRefresh,
      }),
  );
}
