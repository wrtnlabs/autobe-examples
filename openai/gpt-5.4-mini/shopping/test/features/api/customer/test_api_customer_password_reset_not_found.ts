import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that customer password reset lookup returns not found for a missing UUID.
   *
   * This validates that an authenticated customer can access the lookup endpoint, but an unknown password reset identifier does not fabricate a recovery record.
   *
   * The scenario covers the primary-key lookup path and the error behavior for absent records.
   *
   * 1. Register a customer account and obtain an authenticated connection.
   * 2. Query the password reset lookup endpoint using a UUID that does not exist.
   * 3. Assert that the request fails with a not-found HTTP error.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "customer password reset lookup should fail for missing record",
    404,
    async () => {
      await api.functional.mallPlatform.customer.passwordResets.at(
        customerConnection,
        {
          passwordResetId,
        },
      );
    },
  );
}
