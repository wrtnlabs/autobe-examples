import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies customer registration credential policy enforcement and account activation.
 *
 * This test exercises the customer join endpoint with a weak password first to confirm credential policy enforcement, then completes a valid registration to ensure the returned account is active and usable immediately.
 *
 * The scenario also checks that the successful registration returns a normal active customer account with no deleted timestamp, and that authorization tokens are issued so the new customer can proceed to authenticated operations right away.
 *
 * 1. Attempt registration with a weak password and expect rejection.
 * 2. Register a customer with valid credentials and request context.
 * 3. Validate that the created account is active and fully authorized.
 */
export async function test_api_customer_join_credential_policy_protection(
  connection: api.IConnection,
): Promise<void> {
  const email: string = `${RandomGenerator.alphabets(10)}@test.com`;
  const requestUrl: string = `${connection.host}/mallPlatform/auth/customer/join`;
  const referrerUrl: string = `${connection.host}/register`;
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "customer join should reject invalid credential policy",
    [400, 409, 422],
    async () => {
      await authorize_customer_join(invalidConnection, {
        body: {
          email,
          password: "1234",
          href: requestUrl,
          referrer: referrerUrl,
        } satisfies IMallPlatformCustomer.IJoin,
      });
    },
  );
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password: `${RandomGenerator.alphaNumeric(12)}Aa1!`,
      href: requestUrl,
      referrer: referrerUrl,
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined email should match input",
    authorized.email,
    email,
  );
  TestValidator.predicate(
    "new customer should be active",
    authorized.status === "active",
  );
  TestValidator.equals(
    "customer account should have no deleted timestamp",
    authorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "authorization token access should be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token refresh should be non-empty",
    authorized.token.refresh.length > 0,
  );
}
