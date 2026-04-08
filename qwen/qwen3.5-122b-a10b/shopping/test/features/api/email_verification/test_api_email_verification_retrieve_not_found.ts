import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
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
 * Test customer email verification retrieval with non-existent verification ID.
 *
 * Validates that the system properly handles requests for email verification records that do not exist. The test ensures that customers cannot retrieve verification records using invalid or non-existent verification IDs, and that the system returns appropriate 404 errors without leaking information about which verification IDs are valid.
 *
 * This test validates the error handling behavior and security posture of the email verification retrieval endpoint, ensuring that unauthorized access attempts to non-existent resources are properly rejected.
 *
 * 1. Customer joins the platform with valid credentials (email, password, display_name).
 * 2. Customer generates a random UUID that does not correspond to any existing verification record.
 * 3. Customer attempts to retrieve the email verification record using the non-existent verification ID.
 * 4. System returns 404 Not Found error.
 * 5. Validates that the error status is 404 and the system properly handles the missing resource.
 */
export async function test_api_email_verification_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a non-existent verification ID (random UUID)
  const nonExistentVerificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent verification record
  await TestValidator.httpError(
    "non-existent verification record returns 404",
    404,
    async () => {
      await api.functional.ecommerce.customer.email_verifications.at(
        customerConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
}
