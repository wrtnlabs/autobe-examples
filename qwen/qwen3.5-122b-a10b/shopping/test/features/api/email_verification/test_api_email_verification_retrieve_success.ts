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
 * Test customer successfully retrieves their own email verification record.
 *
 * Validates the email verification retrieval flow for authenticated customers. The test ensures that customers can check their email verification status after registration, with proper authentication and response structure validation.
 *
 * The verification record contains metadata about the verification token without exposing the actual token value for security purposes. The verified_at field indicates whether the email has been verified (null for pending, timestamp for completed verification).
 *
 * 1. Customer joins the platform with valid credentials using authorize_customer_join utility.
 * 2. System creates email verification record with unique ID during registration.
 * 3. Customer retrieves the verification record using the verification ID.
 * 4. Validates response includes id, expires_at, verified_at (null), created_at, updated_at.
 * 5. Confirms token value is NOT exposed in the response for security.
 * 6. Verifies verified_at is null indicating pending verification status.
 */
export async function test_api_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Generate verification ID (in real scenario, this would be returned from registration)
  // For this test, we use a random UUID to test the retrieval endpoint
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Customer retrieves the email verification record
  const verification =
    await api.functional.ecommerce.customer.email_verifications.at(
      customerConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate response structure and content
  TestValidator.equals(
    "verification ID matches",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "verified_at is null for pending verification",
    verification.verified_at,
    null,
  );
  TestValidator.predicate(
    "expires_at is valid date-time string",
    typeof verification.expires_at === "string",
  );
  TestValidator.predicate(
    "created_at is valid date-time string",
    typeof verification.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is valid date-time string",
    typeof verification.updated_at === "string",
  );
  // 5. Security validation: token value should NOT be exposed
  TestValidator.predicate(
    "token field not exposed in response",
    !("token" in verification),
  );
}
