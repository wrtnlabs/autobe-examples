import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_token_refresh_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account and get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(initialAuth);
  const refreshToken1 = initialAuth.token.refresh;
  const administratorId = initialAuth.id;
  // Step 2: First refresh - use refresh_token_1 to get new tokens
  const refresh1Connection: api.IConnection = { host: connection.host };
  const auth2 = await authorize_administrator_refresh(refresh1Connection, {
    body: {
      refresh: refreshToken1,
    } satisfies IShoppingMallAdministrator.IRefresh,
  });
  typia.assert(auth2);
  const refreshToken2 = auth2.token.refresh;
  // Step 3: Verify token rotation occurred - new refresh token should be different
  TestValidator.notEquals(
    "refresh token rotated after first refresh",
    refreshToken2,
    refreshToken1,
  );
  // Verify same administrator
  TestValidator.equals(
    "same administrator after refresh",
    auth2.id,
    administratorId,
  );
  // Step 4: Second refresh - use refresh_token_2 to get third token
  const refresh2Connection: api.IConnection = { host: connection.host };
  const auth3 = await authorize_administrator_refresh(refresh2Connection, {
    body: {
      refresh: refreshToken2,
    } satisfies IShoppingMallAdministrator.IRefresh,
  });
  typia.assert(auth3);
  const refreshToken3 = auth3.token.refresh;
  // Verify third token is different from second
  TestValidator.notEquals(
    "refresh token rotated after second refresh",
    refreshToken3,
    refreshToken2,
  );
  // Verify same administrator
  TestValidator.equals(
    "same administrator after second refresh",
    auth3.id,
    administratorId,
  );
  // Step 5: Try to use the old refresh_token_1 (should fail - invalidated)
  // Step 6: Verify 401 Unauthorized for reused token
  await TestValidator.httpError(
    "old refresh token should be invalidated and rejected",
    401,
    async () => {
      const invalidConnection: api.IConnection = { host: connection.host };
      await authorize_administrator_refresh(invalidConnection, {
        body: {
          refresh: refreshToken1,
        } satisfies IShoppingMallAdministrator.IRefresh,
      });
    },
  );
}
