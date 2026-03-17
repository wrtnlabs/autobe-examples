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
 * Test retrieving an email verification record that has already been verified.
 *
 * This test validates the email verification retrieval endpoint by:
 * 1. Registering a new customer account (which creates and verifies email during registration)
 * 2. Retrieving the email verification record using a verification ID
 * 3. Validating that verified_at contains a timestamp (indicating successful verification)
 * 4. Confirming all verification record fields are properly populated including customer information
 *
 * Note: In production, the verificationId would be obtained from an admin endpoint listing
 * verification records or from the registration flow. This test demonstrates the retrieval
 * and validation of a verified email verification record structure.
 */
export async function test_api_customer_email_verification_retrieval_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer (automatically verifies email during registration)
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
  // 2. Retrieve the email verification record
  // The verification ID would typically come from an admin endpoint or registration response.
  // For this test, we use the customer ID as the verification record identifier
  // (assuming the system links verification records to customer IDs)
  const verification =
    await api.functional.shoppingMall.customer.email_verifications.at(
      customerConnection,
      {
        verificationId: customer.id,
      },
    );
  typia.assert(verification);
  // 3. Validate verified_at is populated (indicating successful verification)
  // This is the key assertion - verified_at must not be null for a verified record
  TestValidator.predicate(
    "verified_at is populated for verified record",
    verification.verified_at !== null,
  );
  // 4. Validate customer information matches the registered customer
  TestValidator.equals(
    "customer ID matches registered customer",
    verification.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches registered email",
    verification.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "customer nickname matches",
    verification.customer.nickname,
    customer.nickname,
  );
  TestValidator.equals(
    "customer phone number matches",
    verification.customer.phone_number,
    customer.phone_number,
  );
  // 5. Validate verification record timestamps exist
  TestValidator.predicate(
    "expires_at is valid date-time",
    new Date(verification.expires_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(verification.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(verification.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "verified_at is valid date-time",
    new Date(verification.verified_at!).getTime() > 0,
  );
  // 6. Validate token exists and is non-empty
  TestValidator.predicate(
    "verification token exists and is non-empty",
    verification.token.length > 0,
  );
}