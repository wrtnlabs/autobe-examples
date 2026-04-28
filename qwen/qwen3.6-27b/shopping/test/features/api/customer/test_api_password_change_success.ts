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
 * Test the primary password change success workflow for an authenticated customer.
 *
 * Validates the complete password change process including authentication via customer registration, password update verification, and session invalidation security measure. The test ensures that a customer can successfully change their password from a known current value to a distinct new value, triggering the system to update the stored bcrypt hash and invalidate existing active sessions to force re-login.
 *
 * 1. Register a new customer account with a generated current password to establish authentication context.
 * 2. Authenticate the customer using the registration credentials.
 * 3. Generate a distinct new password that differs from the current password.
 * 4. Invoke the password change endpoint with the current password and the new password.
 * 5. Verify that the password change operation completes successfully with a 204 No Content response, confirming the business logic execution without error.
 */
export async function test_api_password_change_success(
  connection: api.IConnection,
) {
  // 1. Prepare authentication context
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate passwords
  const currentPassword = RandomGenerator.alphaNumeric(16);
  const newPassword = RandomGenerator.alphaNumeric(16);
  // 2. Register and authenticate customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: currentPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: joinBody });
  // 3. Change password
  const changeBody = {
    currentPassword,
    newPassword,
  } satisfies IEcommercePlatformCustomerPasswordReset.IChange;
  // 4. Execute password change (expects 204 No Content, so no response to assert)
  await api.functional.ecommercePlatform.customer.password.change(
    customerConnection,
    {
      body: changeBody,
    },
  );
}
