import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_rotation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login to establish initial session
  const adminConnection: api.IConnection = { host: connection.host };
  const joinOutput = await api.functional.shoppingMall.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IShoppingMallAdmin.IJoin>(),
    },
  );
  typia.assert(joinOutput);
  // Update connection header with access token
  adminConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // 2. Login to establish authenticated session
  const loginOutput = await api.functional.shoppingMall.auth.admin.login(
    adminConnection,
    {
      body: typia.random<IShoppingMallAdmin.ILogin>(),
    },
  );
  typia.assert(loginOutput);
  // Extract initial refresh token
  const initialRefreshToken = loginOutput.token.refresh;
  // 3. First refresh operation
  const firstRefresh = await api.functional.shoppingMall.auth.admin.refresh(
    adminConnection,
    {
      body: {
        refresh: initialRefreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    },
  );
  typia.assert(firstRefresh);
  // 4. Second refresh operation using the new token from first refresh
  const secondRefresh = await api.functional.shoppingMall.auth.admin.refresh(
    adminConnection,
    {
      body: {
        refresh: firstRefresh.token.refresh,
      } satisfies IShoppingMallAdmin.IRefresh,
    },
  );
  typia.assert(secondRefresh);
  // 5. Verify token rotation - previous tokens should be invalidated
  // Attempt to use the initial refresh token again (should fail)
  try {
    await api.functional.shoppingMall.auth.admin.refresh(adminConnection, {
      body: {
        refresh: initialRefreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
    throw new Error("Previous refresh token should have been invalidated");
  } catch (error) {
    typia.assert(error);
  }
  // 6. Verify the new token from second refresh works
  const thirdRefresh = await api.functional.shoppingMall.auth.admin.refresh(
    adminConnection,
    {
      body: {
        refresh: secondRefresh.token.refresh,
      } satisfies IShoppingMallAdmin.IRefresh,
    },
  );
  typia.assert(thirdRefresh);
  // 7. Verify second refresh token is now invalidated
  try {
    await api.functional.shoppingMall.auth.admin.refresh(adminConnection, {
      body: {
        refresh: secondRefresh.token.refresh,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
    throw new Error("Second refresh token should have been invalidated");
  } catch (error) {
    typia.assert(error);
  }
  // 8. Test that tokens have proper expiration metadata
  typia.assert(firstRefresh.token.expired_at);
  typia.assert(firstRefresh.token.refreshable_until);
  typia.assert(firstRefresh.token.access);
  typia.assert(firstRefresh.token.refresh);
}
