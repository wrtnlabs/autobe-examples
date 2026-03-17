import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Create admin-specific connection for registration
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // Generate valid admin credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Register new administrator account
  const registrationResponse = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(email),
      password,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(registrationResponse);
  // Validate registration response structure
  TestValidator.predicate(
    "email matches",
    registrationResponse.email === email,
  );
  TestValidator.predicate(
    "admin_grade is regular",
    registrationResponse.admin_grade === "regular",
  );
  TestValidator.predicate(
    "account_status is active",
    registrationResponse.account_status === "active",
  );
  // Validate token structure from registration
  TestValidator.predicate(
    "access token exists",
    registrationResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    registrationResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is set",
    registrationResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    registrationResponse.token.refreshable_until !== undefined,
  );
  // Create new admin connection for login test
  const adminLoginConnection: api.IConnection = { host: connection.host };
  // Step 2: Login with registered credentials
  const loginResponse = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(email),
      password,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate login response contains valid tokens
  TestValidator.predicate(
    "login access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  // Step 4: Verify admin profile information
  TestValidator.equals("login email matches", loginResponse.email, email);
  TestValidator.predicate(
    "admin_grade is regular",
    loginResponse.admin_grade === "regular",
  );
  TestValidator.predicate(
    "account_status is active",
    loginResponse.account_status === "active",
  );
  // Step 5: Verify token expiration timestamps
  TestValidator.predicate(
    "expired_at is set",
    loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    loginResponse.token.refreshable_until !== undefined,
  );
  TestValidator.predicate(
    "expired_at is after now",
    new Date(loginResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(loginResponse.token.refreshable_until) >
      new Date(loginResponse.token.expired_at),
  );
  // Step 6: Verify login response id matches registration id
  TestValidator.equals(
    "admin id preserved",
    loginResponse.id,
    registrationResponse.id,
  );
}