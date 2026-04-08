import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email address for testing
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // Step 1: Register the first customer with the email address
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstCustomer);
  // Validate the first registration was successful
  TestValidator.equals(
    "first customer has valid id",
    firstCustomer.id.length > 0,
    true,
  );
  TestValidator.equals(
    "first customer email matches",
    firstCustomer.email,
    testEmail,
  );
  // Step 2: Attempt to register a second customer with the same email
  // This should fail with HTTP 409 Conflict
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email returns 409 Conflict",
    409,
    async () => {
      await authorize_customer_join(secondCustomerConnection, {
        body: {
          email: testEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
  // Step 3: Verify the original customer account is still accessible
  // by logging in with the original credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInCustomer = await authorize_customer_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loggedInCustomer);
  // Verify the account is still the original one
  TestValidator.equals(
    "original customer still exists",
    loggedInCustomer.id,
    firstCustomer.id,
  );
  TestValidator.equals(
    "email still matches original",
    loggedInCustomer.email,
    testEmail,
  );
}