import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_health_auth_failure(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Request without authentication token (should fail with 401)
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  try {
    await api.functional.shoppingMall.admin.dashboard.health.at(
      unauthenticatedConnection,
    );
    throw new Error(
      "Expected authentication failure for unauthenticated request",
    );
  } catch (error) {
    TestValidator.httpError(
      "unauthenticated request should return 401",
      401,
      () => {
        throw error;
      },
    );
  }
  // Test 2: Request with malformed/invalid token (should fail with 401)
  const invalidTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: "Bearer invalid-token-format",
    },
  };
  try {
    await api.functional.shoppingMall.admin.dashboard.health.at(
      invalidTokenConnection,
    );
    throw new Error("Expected authentication failure for invalid token");
  } catch (error) {
    TestValidator.httpError("invalid token should return 401", 401, () => {
      throw error;
    });
  }
  // Test 3: Request with expired token (should fail with 401)
  const expiredTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    },
  };
  try {
    await api.functional.shoppingMall.admin.dashboard.health.at(
      expiredTokenConnection,
    );
    throw new Error("Expected authentication failure for expired token");
  } catch (error) {
    TestValidator.httpError("expired token should return 401", 401, () => {
      throw error;
    });
  }
  // Test 4: Request with valid token should succeed
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  const healthStatus =
    await api.functional.shoppingMall.admin.dashboard.health.at(
      adminConnection,
    );
  typia.assert(healthStatus);
}
