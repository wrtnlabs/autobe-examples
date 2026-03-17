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
 * Test successful administrator account registration.
 *
 * This test verifies the complete admin registration workflow:
 * 1. Register a new administrator with valid credentials
 * 2. Verify response contains JWT tokens, admin ID, email, and grade
 * 3. Confirm grade is ADMIN (not SUPER_ADMIN) as per business rules
 * 4. Validate token structure with access and refresh tokens
 * 5. Verify timestamps are properly formatted
 * 6. Confirm registration provides immediate authentication
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register new administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const output: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    { body: adminCredentials },
  );
  // Validate complete response structure
  typia.assert(output);
  // Verify business logic: email matches registration input
  TestValidator.equals(
    "email matches registration",
    output.email,
    adminCredentials.email,
  );
  // Verify business rule: grade is ADMIN not SUPER_ADMIN for new registrations
  TestValidator.equals("grade is ADMIN not SUPER_ADMIN", output.grade, "ADMIN");
  // Verify business state: deleted_at is null for new active account
  TestValidator.equals(
    "deleted_at is null for new account",
    output.deleted_at,
    null,
  );
  // Verify token presence: access and refresh tokens exist and are non-empty
  TestValidator.predicate(
    "access token exists and is non-empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is non-empty",
    output.token.refresh.length > 0,
  );
  // Verify token expiration timestamps are valid
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(output.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(output.token.refreshable_until) > new Date(),
  );
}
