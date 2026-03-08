import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join seller account with generated credentials
  const joinPassword = RandomGenerator.alphaNumeric(12);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword satisfies string,
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login seller with matching credentials and get initial token pair
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  const initialRefreshToken = loginResult.token.refresh;
  // 3. Perform initial refresh to get first rotated token
  const refreshConnection1: api.IConnection = { host: connection.host };
  const firstRefreshResult = await authorize_seller_refresh(
    refreshConnection1,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    },
  );
  typia.assert(firstRefreshResult);
  const firstRotatedRefreshToken = firstRefreshResult.token.refresh;
  // 4. Test Attempt 1: Reuse the initial refresh token (should fail - 401 Unauthorized)
  await TestValidator.error(
    "initial refresh token invalidated after rotation",
    async () => {
      await authorize_seller_refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IEcommerceMallSeller.IRefresh,
      });
    },
  );
  // 5. Test Attempt 2: Use the first rotated token (should succeed - 200 OK)
  const refreshConnection2: api.IConnection = { host: connection.host };
  const secondRefreshResult = await authorize_seller_refresh(
    refreshConnection2,
    {
      body: {
        refresh_token: firstRotatedRefreshToken,
      } satisfies IEcommerceMallSeller.IRefresh,
    },
  );
  typia.assert(secondRefreshResult);
  // 6. Validate token rotation completed successfully
  TestValidator.notEquals(
    "refresh token was rotated",
    initialRefreshToken,
    firstRotatedRefreshToken,
  );
  TestValidator.notEquals(
    "refresh token changed after second refresh",
    firstRotatedRefreshToken,
    secondRefreshResult.token.refresh,
  );
  TestValidator.notEquals(
    "access token was refreshed",
    loginResult.token.access,
    secondRefreshResult.token.access,
  );
  TestValidator.equals(
    "seller identity preserved across rotations",
    joinResult.id,
    secondRefreshResult.id,
  );
  TestValidator.equals(
    "seller email preserved across rotations",
    joinResult.email,
    secondRefreshResult.email,
  );
}
