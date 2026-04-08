import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
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
 * Test password reset record retrieval with non-existent UUID returns 404 error.
 *
 * Validates that requesting a password reset record with a UUID that does not exist in the database returns a proper 404 Not Found error. This ensures the system correctly handles invalid password reset token lookups without exposing information about which UUIDs exist.
 *
 * The test authenticates as a customer, generates a random UUID that is guaranteed not to exist, and verifies the API returns the appropriate HTTP error response.
 *
 * 1. Authenticate as customer to access password reset records.
 * 2. Generate a random UUID that does not exist in the database.
 * 3. Call the password reset record endpoint with the non-existent UUID.
 * 4. Validate that the API throws HttpError with 404 status code.
 */
export async function test_api_password_reset_record_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Generate non-existent UUID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. & 4. Call endpoint and validate 404 error
  await TestValidator.httpError(
    "password reset record not found",
    404,
    async () => {
      await api.functional.ecommerce.customer.password_resets.at(
        customerConnection,
        {
          resetId: nonExistentId,
        },
      );
    },
  );
}
