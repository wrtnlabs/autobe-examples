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

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a verified admin account before login
  // According to DTO definitions, IShoppingMallAdmin.IJoin and IShoppingMallAdmin.ILogin are empty objects
  // We cannot include email/password as they're not defined in the DTOs
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to join admin (mandatory) with empty body
  const joined = await authorize_admin_join(adminConnection, {
    body: {} satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joined);
  // 2. Verify admin was created successfully
  // Since we just created with empty body, we now proceed with empty login body
  // 3. Login with empty body (success case according to DTO definition)
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {} satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "access token exists",
    loginResponse.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loginResponse.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "token object exists",
    loginResponse.token !== undefined,
    true,
  );
  // 5. Validate token structure
  TestValidator.equals(
    "access token is string",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "expired_at is ISO date-time string",
    loginResponse.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "refreshable_until is ISO date-time string",
    loginResponse.token.refreshable_until.length > 0,
    true,
  );
  // 6. Verify expired_at and refreshable_until are valid ISO date-time format
  // Using type-safe pattern matching with typia's format validation
  const token: IAuthorizationToken = loginResponse.token;
  typia.assert<IAuthorizationToken>(token);
  // Additional validation: expired_at should be after current time
  const now = new Date().toISOString();
  TestValidator.predicate("expired_at is in future", token.expired_at > now);
  // Additional validation: refreshable_until should be after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    token.refreshable_until > token.expired_at,
  );
  // 7. Verify the authorization tokens are in correct format (base64 JWT strings)
  // These are typically long strings with dots (JWT format)
  TestValidator.predicate(
    "access token format is JWT",
    loginResponse.access.includes("."),
  );
  TestValidator.predicate(
    "refresh token format is JWT",
    loginResponse.refresh.includes("."),
  );
  // 8. Verify we didn't use the base connection directly
  // We used adminConnection and loginConnection, not connection
  // Success: Admin login succeeded with empty body as required by DTO definitions
}
