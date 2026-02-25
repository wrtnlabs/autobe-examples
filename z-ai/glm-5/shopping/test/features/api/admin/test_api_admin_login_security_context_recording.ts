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

/**
 * Test administrator login with complete security context recording for audit trail.
 *
 * This test validates that the admin login endpoint properly captures and records
 * security context information including:
 * - Client IP address for geographic tracking and security monitoring
 * - href URL being accessed for audit trail
 * - referrer URL for fraud detection
 * - JWT tokens with proper expiration for session management
 *
 * The security context enables:
 * - Device and session management
 * - Security monitoring and anomaly detection
 * - Audit trail for compliance and investigations
 */
export async function test_api_admin_login_security_context_recording(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin account with specific credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      href: "https://admin.shoppingmall.com/join",
      referrer: "https://admin.shoppingmall.com/",
      ip: "192.168.1.100",
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with comprehensive security context for audit trail
  const loginHref = "https://admin.shoppingmall.com/dashboard";
  const loginReferrer = "https://admin.shoppingmall.com/login";
  const loginIp = "192.168.1.101";
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: loginHref,
      referrer: loginReferrer,
      ip: loginIp,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate response contains admin profile with correct data
  TestValidator.equals("admin id matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, adminEmail);
  TestValidator.equals("name matches", loginResult.name, adminName);
  TestValidator.equals("grade is regular", loginResult.grade, "regular");
  // Step 4: Validate JWT tokens are properly issued
  TestValidator.predicate("access token exists", loginResult.access.length > 0);
  TestValidator.predicate(
    "refresh token exists",
    loginResult.refresh.length > 0,
  );
  TestValidator.equals(
    "token access matches",
    loginResult.token.access,
    loginResult.access,
  );
  TestValidator.equals(
    "token refresh matches",
    loginResult.token.refresh,
    loginResult.refresh,
  );
  // Step 5: Validate expiration times are properly set for session management
  const now = new Date();
  const expiredAt = new Date(loginResult.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate("expired_at is in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until after expired_at",
    refreshableUntil > expiredAt,
  );
  // Step 6: Validate new session tokens differ from registration (security measure)
  TestValidator.notEquals(
    "access token differs from join",
    joinResult.access,
    loginResult.access,
  );
  TestValidator.notEquals(
    "refresh token differs from join",
    joinResult.refresh,
    loginResult.refresh,
  );
}
