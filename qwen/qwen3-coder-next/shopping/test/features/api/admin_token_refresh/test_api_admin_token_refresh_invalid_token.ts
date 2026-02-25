import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare invalid refresh token (using random UUID which is not valid)
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();
  // Expect the refresh to fail with invalid token
  await TestValidator.error("should reject invalid refresh token", async () => {
    await api.functional.shoppingMall.auth.admin.refresh(adminConnection, {
      body: {
        refreshToken: invalidRefreshToken,
      } satisfies IShoppingMallAdmin.IRefresh,
    });
  });
}
