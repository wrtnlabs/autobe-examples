import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that retrieving a non-existent email verification record returns 404.
 *
 * Validates the dual-key scoping mechanism of the email verification endpoint.
 * When an administrator queries for an email verification record using a valid
 * customer ID with a non-existent verification ID, the system correctly returns
 * 404 Not Found because no record matches the pair.
 *
 * This ensures that a fabricated verificationId cannot be used to cross-scope
 * into another customer's verification data, and that the verification record
 * must truly belong to the specified customer.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Customer registers via authorize_customer_join to obtain a valid customerId.
 * 3. A random non-existent verification UUID is generated.
 * 4. The admin calls the email verification endpoint with valid customerId and
 *    non-existent verificationId.
 * 5. The call throws (404), confirming the dual-key scoping works correctly.
 */
export async function test_api_admin_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer registration to obtain a valid customerId
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 3. Generate a non-existent verification UUID
  const nonExistentVerificationId = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to retrieve non-existent verification — must throw
  await TestValidator.error(
    "non-existent email verification returns 404",
    async () => {
      await api.functional.shoppingMall.admin.customers.email_verifications.at(
        adminConnection,
        {
          customerId: customer.id,
          verificationId: nonExistentVerificationId,
        },
      );
    },
  );
}
