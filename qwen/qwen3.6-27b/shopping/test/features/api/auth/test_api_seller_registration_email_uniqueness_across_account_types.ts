import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test cross-account email uniqueness during seller registration.
 *
 * Validates that the platform enforces email address uniqueness across all account types (customers, sellers, and administrators). A customer account is first registered with a specific email address, then an attempt to register a seller account with the same email is made. The seller registration must be rejected because the email already exists in the customers table, confirming the cross-account email deduplication invariant.
 *
 * This test ensures that duplicate email detection is performed across all platform account tables before creating any new account, preventing the same email from belonging to multiple account types.
 *
 * 1. Register a customer account with a unique email address.
 * 2. Attempt to register a seller account with the same email address.
 * 3. Verify the seller registration fails due to email already being in use.
 */
export async function test_api_seller_registration_email_uniqueness_across_account_types(
  connection: api.IConnection,
): Promise<void> {
  // Generate a shared email that will be used by both customer and seller join attempts
  const sharedEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  // 1. Register customer with the shared email
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: sharedEmail,
    },
  });
  typia.assert(customerAuthorized);
  // Verify customer was created with the expected email
  TestValidator.equals(
    "customer email matches shared email",
    customerAuthorized.email,
    sharedEmail,
  );
  // 2. Attempt to register seller with the same email - should fail
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "seller registration fails when email is already used by a customer account",
    async () => {
      await authorize_seller_join(sellerJoinConnection, {
        body: {
          email: sharedEmail,
        },
      });
    },
  );
}
