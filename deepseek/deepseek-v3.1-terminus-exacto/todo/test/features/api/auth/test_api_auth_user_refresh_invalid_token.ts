import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_auth_user_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create user account and obtain valid tokens
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: "testuser@example.com",
      password: "testpassword123",
      display_name: "Test User",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Extract valid refresh token
  const validRefreshToken = authorizedUser.token.refresh;
  // Test 1: Modified refresh token (tampered)
  const tamperedToken = validRefreshToken.slice(0, -5) + "ABCDE";
  try {
    await api.functional.todoApp.auth.user.refresh(userConnection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies ITodoAppUser.IRefresh,
    });
    throw new Error("Tampered refresh token should have failed");
  } catch (error) {
    // Expected - token validation should fail
  }
  // Test 2: Completely invalid token
  const invalidToken = "invalid_token_string_that_is_not_jwt_format";
  try {
    await api.functional.todoApp.auth.user.refresh(userConnection, {
      body: {
        refresh_token: invalidToken,
      } satisfies ITodoAppUser.IRefresh,
    });
    throw new Error("Invalid token should have failed");
  } catch (error) {
    // Expected - token validation should fail
  }
  // Test 3: Empty token
  try {
    await api.functional.todoApp.auth.user.refresh(userConnection, {
      body: {
        refresh_token: "",
      } satisfies ITodoAppUser.IRefresh,
    });
    throw new Error("Empty token should have failed");
  } catch (error) {
    // Expected - token validation should fail
  }
  // Test 4: Null token (as string "null")
  try {
    await api.functional.todoApp.auth.user.refresh(userConnection, {
      body: {
        refresh_token: "null",
      } satisfies ITodoAppUser.IRefresh,
    });
    throw new Error("Null token should have failed");
  } catch (error) {
    // Expected - token validation should fail
  }
}
