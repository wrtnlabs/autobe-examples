import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving a non-existent email verification record.
 *
 * This test validates that the system correctly returns a 404 error
 * when attempting to retrieve an email verification record that does
 * not exist in the system. The test uses a valid UUID format that was
 * never created as a verification record.
 *
 * Test Flow:
 * 1. Customer registers and authenticates
 * 2. Generate non-existent verification UUID
 * 3. Attempt to retrieve the verification record
 * 4. Validate 404 HTTP error response
 */
export async function test_api_customer_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate a valid UUID that does not exist in the system
  const nonExistentVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent verification and validate 404 error
  await TestValidator.httpError(
    "non-existent email verification returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.customer.email_verifications.at(
        customerConnection,
        {
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
}
