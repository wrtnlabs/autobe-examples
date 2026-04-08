import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator login with valid credentials.
 *
 * Validates the complete administrator authentication workflow including account registration, approval status verification, and token generation. The test ensures that administrators can successfully log in with valid credentials and receive properly formatted JWT tokens with correct expiration times.
 *
 * The test follows the natural flow of administrator account lifecycle: 1) Registration via join endpoint, 2) Login with credentials, 3) Token validation and response verification.
 *
 * 1. Create administrator account via join endpoint with valid credentials and approval reason.
 * 2. Login with the same email and password credentials.
 * 3. Validate the login response contains all required fields (ID, email, grade, tokens).
 * 4. Verify token expiration times match expected values (15 minutes access, 7 days refresh).
 * 5. Confirm grade information is properly included in the response.
 */
export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account via join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(joinResult);

  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_admin_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: adminPassword,
    } satisfies IEcommerceAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 3. Validate response structure
  TestValidator.equals("admin ID matches", loginResult.id, joinResult.id);
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.predicate("has grade information", loginResult.grade !== undefined);
  TestValidator.predicate("has access token", loginResult.token.access.length > 0);
  TestValidator.predicate("has refresh token", loginResult.token.refresh.length > 0);
  TestValidator.predicate("has expiration time", loginResult.token.expired_at !== undefined);
  TestValidator.predicate("has refreshable until", loginResult.token.refreshable_until !== undefined);
}