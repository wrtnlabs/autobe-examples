import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test token refresh failure with invalid refresh token.
 *
 * This test validates the security boundary that prevents unauthorized session extension.
 * It submits a refresh request with a malformed/tampered refresh token and verifies
 * the system returns HTTP 401 Unauthorized error.
 */
export async function test_api_seller_token_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. First, create a valid seller account to establish test context
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(seller);
  // 2. Test with completely invalid/malformed refresh token
  await TestValidator.httpError(
    "should return 401 for completely invalid refresh token",
    401,
    async () => {
      const fakeConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.seller.refresh(fakeConnection, {
        body: {
          refreshToken: "invalid-token-string",
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
  // 3. Test with tampered/tampered JWT format token
  await TestValidator.httpError(
    "should return 401 for tampered JWT format token",
    401,
    async () => {
      const fakeConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.seller.refresh(fakeConnection, {
        body: {
          refreshToken:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.payload.signature",
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
  // 4. Test with random alphanumeric token
  await TestValidator.httpError(
    "should return 401 for random alphanumeric token",
    401,
    async () => {
      const fakeConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.seller.refresh(fakeConnection, {
        body: {
          refreshToken: typia.random<string>(),
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
}
