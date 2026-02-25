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

export async function test_api_admin_login_email_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create an admin account first (since we need existing admin to test)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "TestPassword123!",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // Test: Attempt to login with non-existent email
  const nonExistentEmail = "nonexistent@example.com";
  const loginBody = {
    email: nonExistentEmail,
    password: "TestPassword123!",
  } satisfies IShoppingMallAdmin.ILogin;
  // Attempt login with non-existent email
  try {
    await api.functional.shoppingMall.auth.admin.login(connection, {
      body: loginBody,
    });
    throw new Error("Expected login to fail for non-existent email");
  } catch (error) {
    // Verify that the error is a 404 Not Found
    TestValidator.httpError(
      "login should fail with 404 for non-existent email",
      404,
      () => {
        throw error;
      },
    );
  }
}
