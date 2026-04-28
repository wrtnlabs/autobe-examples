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
 * Test that retrieving a non-existent password reset token returns a 404 not found error.
 *
 * Validates that the password reset retrieval endpoint properly handles requests for unknown token IDs by returning an appropriate HTTP error response. This ensures the API correctly identifies missing records and prevents any data leakage about existing password reset tokens.
 *
 * The test authenticates as a customer and attempts to retrieve a password reset record using a randomly generated UUID that cannot possibly match any existing record in the system. This verifies the endpoint's error handling path for missing records.
 *
 * 1. Authenticate as a customer by joining the platform with random credentials.
 * 2. Generate a random UUID that does not correspond to any existing password reset token.
 * 3. Call the password reset retrieval endpoint with the non-existent token ID.
 * 4. Verify that the API throws an HttpError with a 404 Not Found status code.
 */
export async function test_api_password_reset_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const nonExistentResetId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent password reset returns 404",
    404,
    async () =>
      await api.functional.ecommercePlatform.customer.password_resets.at(
        customerConnection,
        {
          resetId: nonExistentResetId,
        },
      ),
  );
}
