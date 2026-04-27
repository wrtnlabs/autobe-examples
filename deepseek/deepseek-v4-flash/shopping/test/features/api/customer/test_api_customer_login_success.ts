import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
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
 * Test successful customer login with valid email and password.
 *
 * Validates the complete customer authentication flow: registering a customer account and then logging in with the same credentials. Ensures the login response correctly identifies the customer, returns the profile with defaults, and creates a new session with a distinct access token.
 *
 * Special attention is given to verifying that the login creates a new session (access token differs from registration) and that account status fields (banned_at, deleted_at) are null for a healthy account.
 *
 * 1. Register a customer with known email, password, and session metadata.
 * 2. Login with the same credentials.
 * 3. Validate customer identity matches, profile defaults are correct, and a new session token was issued.
 */
export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a customer account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joinOutput: IECommerceMallCustomer.IAuthorized =
    await authorize_customer_join(joinConnection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip: null,
      },
    });
  typia.assert(joinOutput);
  // Step 2: Login with the same credentials on a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput: IECommerceMallCustomer.IAuthorized =
    await authorize_customer_login(loginConnection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IECommerceMallCustomer.ILogin,
    });
  typia.assert(loginOutput);
  // Step 3: Business logic validations
  TestValidator.equals(
    "customer id matches registered account",
    loginOutput.id,
    joinOutput.id,
  );
  TestValidator.equals("email matches input", loginOutput.email, email);
  // Profile defaults: display_name empty, phone_number null
  TestValidator.equals(
    "profile id matches registered profile",
    loginOutput.profile.id,
    joinOutput.profile.id,
  );
  TestValidator.equals(
    "display_name is empty by default",
    loginOutput.profile.display_name,
    "",
  );
  TestValidator.equals(
    "phone_number is null by default",
    loginOutput.profile.phone_number,
    null,
  );
  // Account status: not banned, not deleted
  TestValidator.equals(
    "banned_at is null (not banned)",
    loginOutput.banned_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (not deleted)",
    loginOutput.deleted_at,
    null,
  );
  // Token: login issued a new access token (not reusing registration session)
  TestValidator.notEquals(
    "login access token differs from registration token",
    loginOutput.token.access,
    joinOutput.token.access,
  );
  // Token expiration timestamps are in the future
  const now = new Date();
  TestValidator.predicate(
    "access token expired_at is in the future",
    new Date(loginOutput.token.expired_at).getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is in the future",
    new Date(loginOutput.token.refreshable_until).getTime() > now.getTime(),
  );
}
