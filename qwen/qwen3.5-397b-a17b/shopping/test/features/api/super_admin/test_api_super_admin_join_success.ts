import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test successful super administrator account registration.
 *
 * This test validates the complete super admin join workflow:
 * 1. Create a new super admin account with valid credentials
 * 2. Verify the response contains account information (id, email)
 * 3. Verify JWT tokens are returned (access, refresh, expiration timestamps)
 * 4. Verify the connection is automatically configured with the access token
 * 5. Validate the complete response structure using typia.assert
 */
export async function test_api_super_admin_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super admin registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Prepare registration credentials with valid test data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallSuperAdmin.IJoin;
  // Register new super admin account using utility function
  // This automatically updates superAdminConnection.headers with the access token
  const result: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: joinInput,
    });
  // Validate the complete response structure
  typia.assert(result);
  // Verify account information is present and valid
  TestValidator.predicate("super admin id exists", result.id.length > 0);
  TestValidator.equals("email matches input", result.email, joinInput.email);
  // Verify token structure is valid
  TestValidator.predicate(
    "access token exists",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp exists",
    result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until timestamp exists",
    result.token.refreshable_until.length > 0,
  );
  // Verify timestamps are valid ISO 8601 format dates
  const expiredAtDate = new Date(result.token.expired_at);
  const refreshableUntilDate = new Date(result.token.refreshable_until);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAtDate.getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntilDate.getTime()),
  );
  // Verify expiration is in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    expiredAtDate.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token valid in future",
    refreshableUntilDate.getTime() > now.getTime(),
  );
  // Verify refreshable_until is after or equal to expired_at
  TestValidator.predicate(
    "refreshable period covers access token lifetime",
    refreshableUntilDate.getTime() >= expiredAtDate.getTime(),
  );
  // Verify the connection was automatically configured with access token
  TestValidator.predicate(
    "connection has authorization header",
    superAdminConnection.headers !== undefined &&
      superAdminConnection.headers.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    superAdminConnection.headers?.Authorization,
    result.token.access,
  );
}
