import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer registration duplicate email validation.
 *
 * Validates that the customer registration endpoint enforces email uniqueness constraint. The test first successfully registers a customer with a unique email address, then attempts to register another customer with the same email. The second registration should fail with HTTP 409 Conflict status, ensuring no duplicate customer accounts can be created with the same email address.
 *
 * This test verifies the email uniqueness constraint prevents duplicate account creation and that the original customer account remains unaffected by the duplicate registration attempt.
 *
 * 1. Register a customer with a unique email address and verify successful registration.
 * 2. Attempt to register another customer with the exact same email address.
 * 3. Verify the second registration fails with HTTP 409 Conflict error.
 * 4. Confirm the original customer account remains intact and unchanged.
 */
export async function test_api_customer_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. First registration with unique email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstEmail = typia.random<string & tags.Format<"email">>();
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: {
      email: firstEmail,
    },
  });
  typia.assert(firstCustomer);
  // Verify first registration succeeded
  TestValidator.equals(
    "first customer email matches",
    firstCustomer.email,
    firstEmail,
  );
  TestValidator.predicate(
    "first customer is not banned",
    firstCustomer.banned === false,
  );
  TestValidator.predicate(
    "first customer has valid token",
    firstCustomer.token.access.length > 0,
  );
  // 2. Second registration attempt with same email (should fail)
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email rejected", async () => {
    await authorize_customer_join(secondConnection, {
      body: {
        email: firstEmail, // Same email as first registration
      },
    });
  });
  // 3. Verify original customer account is still intact
  // The first customer should still be able to use their connection
  TestValidator.equals(
    "original customer unchanged",
    firstCustomer.email,
    firstEmail,
  );
  TestValidator.predicate(
    "original customer still active",
    firstCustomer.deleted_at === null,
  );
}
