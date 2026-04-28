import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
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
 * Test password change rejection when incorrect current password is provided.
 *
 * Validates that the password change endpoint rejects requests when the authenticated customer submits an incorrect current password. The system must verify the provided password against the stored password hash before allowing any modification, ensuring only the legitimate account holder can update credentials.
 *
 * When the current password does not match, the endpoint returns 401 Unauthorized. The customer's original password remains unchanged and all existing authentication sessions remain valid since no update occurred.
 *
 * 1. Register and authenticate a new customer account with a known password using authorize_customer_join.
 * 2. Construct a password change request with an incorrect current password and a valid new password.
 * 3. Call the password change endpoint and validate that it throws a 401 Unauthorized HTTP error.
 */
export async function test_api_password_change_incorrect_current_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer with known password
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword,
    },
  });
  typia.assert(authorized);
  // 2. Attempt password change with incorrect current password
  const body = {
    currentPassword: "this_is_an_incorrect_password" satisfies string &
      tags.Format<"password">,
    newPassword: RandomGenerator.alphaNumeric(16) satisfies string &
      tags.Format<"password">,
  } satisfies IEcommercePlatformCustomerPasswordReset.IChange;
  // 3. Validate that 401 Unauthorized is thrown
  await TestValidator.httpError(
    "incorrect current password returns 401",
    401,
    async () => {
      await api.functional.ecommercePlatform.customer.password.change(
        customerConnection,
        { body },
      );
    },
  );
}
