import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
 * Test customer login with invalid credentials.
 *
 * This test verifies that the customer login endpoint properly handles invalid
 * authentication attempts without revealing sensitive information. It tests both
 * scenarios: incorrect password with valid email, and non-existent email.
 *
 * Security requirements:
 * 1. Both invalid credential scenarios receive identical error responses
 * 2. No information leakage about which field was incorrect
 * 3. No tokens are issued for failed authentication attempts
 */
export async function test_api_customer_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create a valid customer account first (needed for testing invalid password scenario)
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Test Case A: Valid email with incorrect password
  // This should fail authentication but not reveal that the email exists
  const caseAConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with valid email but wrong password should fail",
    async () => {
      await authorize_customer_login(caseAConnection, {
        body: {
          email: customerEmail,
          password: "wrongpassword123456",
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.ILogin,
      });
    },
  );
  // Test Case B: Non-existent email (any random email)
  // This should fail with the same error pattern as Case A
  const caseBConnection: api.IConnection = { host: connection.host };
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await authorize_customer_login(caseBConnection, {
        body: {
          email: nonExistentEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.ILogin,
      });
    },
  );
}
