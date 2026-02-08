import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Register a new user via user join utility function
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, { body: {} });
  typia.assert(authorized);
  // Attempt to refresh token with an invalid/expired refresh token
  const invalidRefreshToken = "invalid-or-expired-refresh-token-value";
  const refreshConnection: api.IConnection = { host: connection.host };
  // Set invalid refresh token in Authorization header
  refreshConnection.headers = { Authorization: invalidRefreshToken };
  // Call refresh utility with empty body (IRefresh is empty type)
  await TestValidator.error("refresh with invalid token", async () => {
    await authorize_user_refresh(refreshConnection, { body: {} });
  });
}
