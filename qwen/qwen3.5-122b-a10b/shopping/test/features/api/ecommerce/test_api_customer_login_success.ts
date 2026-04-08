import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful customer login with valid credentials.
 *
 * Validates that a registered customer can successfully authenticate using their email and password credentials. The test verifies the complete authentication flow including JWT token issuance and customer information retrieval.
 *
 * The test ensures that login with correct credentials returns proper authorization tokens and customer profile data, enabling subsequent authenticated API operations.
 *
 * 1. Generate random customer credentials (email, password, display_name, phone_number).
 * 2. Register a new customer account with the generated credentials.
 * 3. Login with the registered email and password.
 * 4. Validate response contains customer information (id, display_name, phone_number, created_at, updated_at, deleted_at).
 * 5. Validate authorization token structure (access, refresh, expired_at, refreshable_until).
 * 6. Verify customer ID and profile data match between registration and login responses.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate and store customer credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();
  const phone_number = RandomGenerator.mobile();
  // 2. Register customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      display_name,
      phone_number,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 3. Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 4. Validate customer information
  TestValidator.equals("customer ID matches", loginResult.id, joinResult.id);
  TestValidator.equals(
    "display_name preserved",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "phone_number preserved",
    loginResult.phone_number,
    joinResult.phone_number,
  );
  TestValidator.predicate(
    "created_at exists",
    loginResult.created_at !== null && loginResult.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    loginResult.updated_at !== null && loginResult.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null for active account",
    loginResult.deleted_at === null,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    loginResult.token.expired_at !== null &&
      loginResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loginResult.token.refreshable_until !== null &&
      loginResult.token.refreshable_until !== undefined,
  );
}
