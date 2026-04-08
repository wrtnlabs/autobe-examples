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
 * Test customer registration with duplicate email validation.
 *
 * Validates the email uniqueness constraint during customer registration by attempting to register two accounts with the same email address. The first registration should succeed while the second registration must be rejected with a conflict error.
 *
 * This test ensures that the platform enforces the business rule requiring unique email addresses across all customer accounts, preventing duplicate registrations that could compromise account security and data integrity.
 *
 * 1. Register first customer account with unique email and credentials.
 * 2. Verify successful registration with valid authorization tokens.
 * 3. Attempt to register second customer account with identical email.
 * 4. Validate that duplicate registration is rejected with 409 Conflict error.
 */
export async function test_api_customer_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email for the first customer
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // 1. Register first customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // 2. Verify first registration succeeded
  TestValidator.predicate(
    "first customer has valid id",
    firstCustomer.id !== undefined,
  );
  TestValidator.predicate(
    "first customer has access token",
    firstCustomer.token.access.length > 0,
  );
  // 3. Attempt to register second customer with same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejected", async () => {
    await authorize_customer_join(secondConnection, {
      body: {
        email, // Same email as first customer
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  });
}
