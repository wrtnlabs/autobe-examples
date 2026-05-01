import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
 * Validates the complete login flow where a registered customer authenticates using their email and password. Ensures that the system correctly looks up the customer account, verifies the password against the stored cryptographic hash, creates a new session recording the client's originating page URL and HTTP referrer, and returns the full profile data with a JWT token pair.
 *
 * The test verifies that the response contains all expected fields including customer identity (id as UUID, email, display_name), account status indicators (phone_number, banned_at, deleted_at as null), audit timestamps (created_at, updated_at), and the dual-token authentication structure (access token, refresh token, expired_at, refreshable_until).
 *
 * 1. Register a new customer with known email, password, and display_name via authorize_customer_join, explicitly setting phone_number to null.
 * 2. Create a fresh connection and authenticate via authorize_customer_login with the same credentials.
 * 3. Validate that the login response email and display_name match the registered credentials.
 * 4. Confirm phone_number, banned_at, and deleted_at are null for a new account.
 * 5. Verify all four token fields are non-empty, confirming proper session establishment.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      phone_number: null,
    },
  });
  typia.assert(joined);
  // 2. Create a fresh connection and login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loggedIn);
  // 3. Validate business logic: credentials match and account status
  TestValidator.equals("email matches login credential", loggedIn.email, email);
  TestValidator.equals(
    "display_name matches registration",
    loggedIn.display_name,
    displayName,
  );
  TestValidator.equals("phone_number is null", loggedIn.phone_number, null);
  TestValidator.equals("banned_at is null", loggedIn.banned_at, null);
  TestValidator.equals("deleted_at is null", loggedIn.deleted_at, null);
  // 4. Validate token issuance for session establishment
  TestValidator.predicate(
    "access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid timestamp",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid timestamp",
    loggedIn.token.refreshable_until.length > 0,
  );
}
