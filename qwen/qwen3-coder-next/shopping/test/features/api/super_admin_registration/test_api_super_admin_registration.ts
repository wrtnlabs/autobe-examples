import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_registration(
  connection: api.IConnection,
): Promise<void> {
  // Use a unique email for each test run
  const uniqueEmail = `superadmin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const password = "SecurePass123!";
  // 1. Register a new super admin
  const registerResponse =
    await api.functional.shoppingMall.auth.super_admin.join(connection, {
      body: {} satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(registerResponse);
  // 2. Verify response structure
  TestValidator.equals("token exists", registerResponse.token !== null, true);
  TestValidator.equals(
    "access token exists",
    typeof registerResponse.token.access === "string",
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    typeof registerResponse.token.refresh === "string",
    true,
  );
  TestValidator.predicate("expired_at is valid date-time", () => {
    try {
      new Date(registerResponse.token.expired_at);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate("refreshable_until is valid date-time", () => {
    try {
      new Date(registerResponse.token.refreshable_until);
      return true;
    } catch {
      return false;
    }
  });
  // 3. Validate token structure
  const token = registerResponse.token;
  TestValidator.equals(
    "access token format",
    typeof token.access === "string",
    true,
  );
  TestValidator.equals(
    "refresh token format",
    typeof token.refresh === "string",
    true,
  );
  TestValidator.equals("expired_at format", token.expired_at, token.expired_at);
  TestValidator.equals(
    "refreshable_until format",
    token.refreshable_until,
    token.refreshable_until,
  );
}
