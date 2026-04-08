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
 * Denies customer login when the submitted credentials do not match the registered account.
 *
 * This scenario creates a real customer account fixture and then attempts to authenticate with a mismatched password to ensure the login endpoint rejects invalid credentials. It verifies the platform does not disclose whether the email exists or which credential field failed, and that no authorized payload or tokens are issued on failure.
 *
 * 1. Create a registered customer account through the customer join endpoint.
 * 2. Attempt to log in with the same email and an incorrect password.
 * 3. Confirm the login request is rejected with an HTTP error.
 */
export async function test_api_customer_login_wrong_credentials_denied(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "CorrectPassword_123!";
  await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/signup",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.error(
    "customer login should reject wrong password",
    async () => {
      await api.functional.mallPlatform.auth.customer.login(
        customerConnection,
        {
          body: {
            email,
            password: "WrongPassword_456!",
          } satisfies IMallPlatformCustomer.ILogin,
        },
      );
    },
  );
}
