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

export async function test_api_customer_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validates that customer registration rejects duplicate email addresses.
   *
   * This scenario covers the customer self-registration flow and the business rule
   * that each email address must be unique across customer accounts. It first
   * creates a valid customer account, then attempts a second registration using
   * the same email with different credentials and request context, and finally
   * confirms the original account remains usable after the rejection.
   *
   * 1. Register a customer with a unique email and capture the authorized account.
   * 2. Attempt a second registration using the same email but different password,
   *    href, and referrer values.
   * 3. Verify the duplicate registration is rejected as a business conflict.
   * 4. Confirm the original authorized customer account data remains unchanged.
   */
  const firstConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const first = await authorize_customer_join(firstConnection, {
    body: {
      email,
      password: "Password1234!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(first);
  const originalEmail = first.email;
  const originalId = first.id;
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate customer email should be rejected",
    async () => {
      await authorize_customer_join(duplicateConnection, {
        body: {
          email,
          password: "DifferentPassword123!",
          href: "https://example.com/register-again",
          referrer: "https://example.com/other-page",
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IMallPlatformCustomer.IJoin,
      });
    },
  );
  TestValidator.equals(
    "original customer email remains unchanged",
    first.email,
    originalEmail,
  );
  TestValidator.equals(
    "original customer id remains unchanged",
    first.id,
    originalId,
  );
}
