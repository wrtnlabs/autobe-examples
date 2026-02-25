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

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as super administrator to create new admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "SuperAdmin123!",
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2. Generate unique test email and valid password using RandomGenerator
  const testEmail = RandomGenerator.name(1) + "@test.com";
  const testPassword = "AdminTest123!" satisfies string &
    tags.Format<"password">;
  // 3. Register new admin account
  const adminResponse = await api.functional.shoppingMall.auth.admin.join(
    superAdminConnection,
    {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminResponse);
  // 4. Validate response structure and content
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(adminResponse.id),
  );
  TestValidator.equals("email matches input", adminResponse.email, testEmail);
  TestValidator.equals(
    "role grade is admin",
    adminResponse.role_grade,
    "admin",
  );
  TestValidator.predicate(
    "has created_at timestamp",
    adminResponse.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    adminResponse.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", adminResponse.deleted_at, null);
  // 5. Validate authentication tokens
  TestValidator.predicate(
    "has valid access token",
    adminResponse.access_token !== undefined &&
      adminResponse.access_token.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    adminResponse.refresh_token !== undefined &&
      adminResponse.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "has access_expired_at",
    adminResponse.access_expired_at !== undefined,
  );
  TestValidator.predicate(
    "has refresh_expired_at",
    adminResponse.refresh_expired_at !== undefined,
  );
  // 6. Validate token structure
  TestValidator.predicate(
    "token has access property",
    adminResponse.token.access !== undefined,
  );
  TestValidator.predicate(
    "token has refresh property",
    adminResponse.token.refresh !== undefined,
  );
  TestValidator.predicate(
    "token has expired_at",
    adminResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    adminResponse.token.refreshable_until !== undefined,
  );
  // 7. Verify we can login with newly created admin credentials
  const newAdminConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.shoppingMall.auth.admin.login(
    newAdminConnection,
    {
      body: {
        email: testEmail,
        password: testPassword,
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(loginResponse);
  TestValidator.equals(
    "login response email matches",
    loginResponse.email,
    testEmail,
  );
}