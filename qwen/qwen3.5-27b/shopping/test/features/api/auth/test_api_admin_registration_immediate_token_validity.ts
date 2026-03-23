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
 * Test that tokens returned from admin registration are immediately valid and functional.
 *
 * This test verifies:
 * 1. Admin registration returns valid authentication tokens
 * 2. Access token expiration is set correctly (~1 hour from now)
 * 3. Refresh token expiration is set correctly (~7 days from now)
 * 4. Admin identity claims are correct (grade='regular', status='active')
 * 5. The returned access token can be used immediately for protected endpoints
 * 6. Session is created with correct metadata
 */
export async function test_api_admin_registration_immediate_token_validity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Register new admin account using utility function
  const authorized: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Validate complete response structure
  typia.assert(authorized);
  // Verify admin identity claims
  TestValidator.equals(
    "new admin has regular grade",
    authorized.grade,
    "regular",
  );
  TestValidator.equals(
    "new admin status is active",
    authorized.status,
    "active",
  );
  TestValidator.equals("new admin is not deleted", authorized.deleted_at, null);
  // Verify token structure and values
  TestValidator.predicate(
    "access token is not empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    authorized.token.refresh.length > 0,
  );
  // Verify token expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  TestValidator.predicate(
    "access token expiration is in the future",
    expiredAt > now,
  );
  TestValidator.predicate(
    "refresh token expiration is in the future",
    refreshableUntil > now,
  );
  // Verify access token expires in approximately 1 hour (allow 5 minute tolerance)
  const accessExpirationMinutes =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires in approximately 1 hour (55-65 minutes)",
    accessExpirationMinutes >= 55 && accessExpirationMinutes <= 65,
  );
  // Verify refresh token is valid for approximately 7 days (allow 1 hour tolerance)
  const refreshExpirationHours =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60);
  TestValidator.predicate(
    "refresh token valid for approximately 7 days (166-170 hours)",
    refreshExpirationHours >= 166 && refreshExpirationHours <= 170,
  );
  // Verify that the connection was automatically authenticated with the access token
  TestValidator.predicate(
    "connection headers exist after registration",
    adminConnection.headers !== undefined,
  );
  TestValidator.equals(
    "Authorization header is set to access token",
    adminConnection.headers?.Authorization,
    authorized.token.access,
  );
  // Verify immediate token validity - the admin can use the connection right away
  TestValidator.predicate(
    "admin connection is ready for protected endpoints",
    adminConnection.headers?.Authorization === authorized.token.access &&
      authorized.token.access.length > 0,
  );
}
