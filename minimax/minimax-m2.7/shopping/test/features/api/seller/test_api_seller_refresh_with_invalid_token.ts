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

export async function test_api_seller_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account to establish valid session context
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(authorized);
  // Store the original access token for later comparison
  const originalAccessToken = sellerConnection.headers?.Authorization;
  // 2. Call refresh endpoint with invalid/malformed refresh token
  const invalidRefreshToken = "invalid.malformed.refresh.token";
  // 3. Validate response returns 401 Unauthorized
  await TestValidator.httpError(
    "invalid refresh token returns 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.seller.refresh(sellerConnection, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IEcommerceMallSeller.IRefresh,
      }),
  );
  // 4. Verify no new tokens are issued and session remains unchanged
  TestValidator.equals(
    "access token unchanged after invalid refresh",
    sellerConnection.headers?.Authorization,
    originalAccessToken,
  );
}
