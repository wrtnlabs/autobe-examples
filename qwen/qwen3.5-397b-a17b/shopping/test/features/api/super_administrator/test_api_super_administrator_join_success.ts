import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test successful super administrator account registration.
 *
 * This test verifies that a new super administrator account can be created
 * with valid email and password credentials. It validates:
 * 1. Account creation returns complete account information (id, email, timestamps)
 * 2. JWT tokens are generated (access, refresh, expired_at, refreshable_until)
 * 3. Email is properly stored for subsequent login operations
 * 4. Account is immediately active (deleted_at is null)
 * 5. Response structure matches IAuthorized interface
 */
export async function test_api_super_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for super administrator registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Generate unique email to avoid conflicts
  const uniqueEmail = `superadmin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const password = RandomGenerator.alphaNumeric(16);
  // Register new super administrator using utility function
  const authorized: IShoppingMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: uniqueEmail,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallSuperAdministrator.IJoin,
    });
  // Validate response structure - typia.assert performs complete type validation
  typia.assert(authorized);
  // Validate business logic: email matches input
  TestValidator.equals("email matches input", authorized.email, uniqueEmail);
  // Validate business logic: account is immediately active (not soft-deleted)
  TestValidator.equals(
    "account is active (not deleted)",
    authorized.deleted_at,
    null,
  );
  // Verify connection was updated with authorization token for subsequent calls
  TestValidator.predicate(
    "connection has authorization header",
    superAdminConnection.headers?.Authorization !== undefined,
  );
}
