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

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin user with authorize_admin_join
  const adminUser = await authorize_admin_join(connection, {
    body: {},
  });
  // Step 2: Get the refresh token from the authorization response
  const refreshToken: string = adminUser.token.refresh;
  // Step 3: Attempt token refresh using authorize_admin_refresh
  const refreshedToken = await authorize_admin_refresh(connection, {
    body: {},
  });
  // Step 4: Verify the response has the expected structure
  typia.assert(refreshedToken);
  // Verify that we indeed received a new access token (should be different from the old one)
  TestValidator.notEquals(
    "new access token should be different from original",
    adminUser.token.access,
    refreshedToken.token.access,
  );
}
