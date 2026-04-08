import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerPasswordReset";
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
 * Rejects customer password change when the current password is incorrect.
 *
 * Validates that an authenticated customer cannot update credentials with a
 * wrong current password. The test focuses on the password-change workflow and
 * confirms the API rejects the request rather than mutating the stored
 * credential.
 *
 * 1. Register a customer account and capture the issued authorization token.
 * 2. Call the customer password update endpoint with an invalid current password
 *    and a valid replacement password.
 * 3. Verify the request is rejected with an HTTP error.
 */
export async function test_api_customer_password_change_reject_wrong_current_password(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphabets(8)}@test.com`;
  const originalPassword = "Password1234!";
  const authorized = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password: originalPassword,
      href: "https://example.com/customer/join",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: authorized.token.access,
  };
  await TestValidator.httpError(
    "customer password change should reject wrong current password",
    [400, 401, 403],
    async () => {
      await api.functional.mallPlatform.customer.passwords.update(
        authenticatedConnection,
        {
          body: {
            currentPassword: "WrongPassword1234!",
            newPassword: "NewPassword1234!",
          } satisfies IMallPlatformCustomerPasswordReset.IUpdate,
        },
      );
    },
  );
}
