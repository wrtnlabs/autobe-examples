import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful automatic login after administrator registration.
 * 1. Register a new administrator account using authorize_admin_join utility function
 * 2. Validate response contains valid JWT tokens and admin information
 * 3. Verify token structure and expiration times meet requirements
 * 4. Confirm immediate authentication without separate login step
 */
export async function test_api_admin_registration_automatic_login(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Register new admin account using utility function
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Validate token structure
  const token = adminJoinResult.token;
  typia.assert(token);
  // 3. Validate expiration timestamps (business logic: refresh should outlive access)
  const accessExpiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "access token expiration should be valid date",
    !isNaN(accessExpiredAt.getTime()),
  );
  TestValidator.predicate(
    "refresh token expiration should be valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  TestValidator.predicate(
    "refresh token should have longer expiration than access token",
    refreshableUntil > accessExpiredAt,
  );
  // 4. Verify immediate authentication - token should be present
  TestValidator.predicate(
    "access token should be present",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    token.refresh.length > 0,
  );
  // 5. Create authenticated connection for future admin operations
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  authenticatedAdminConnection.headers = {
    Authorization: `Bearer ${token.access}`,
  };
  // 6. Validate automatic login succeeded
  TestValidator.predicate(
    "admin should have id after registration",
    adminJoinResult.id.length > 0,
  );
  TestValidator.predicate(
    "admin should have email after registration",
    adminJoinResult.email.length > 0,
  );
}
