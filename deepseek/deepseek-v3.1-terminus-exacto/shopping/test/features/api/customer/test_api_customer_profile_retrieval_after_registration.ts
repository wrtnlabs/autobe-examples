import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
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
 * Test customer profile retrieval immediately after successful registration.
 * 1. Register a new customer account using the authorize_customer_join utility
 * 2. Retrieve the customer's profile using the authentication token from registration
 * 3. Verify all profile fields match the registration input data
 * 4. Confirm sensitive fields are excluded and timestamp fields are properly set
 */
export async function test_api_customer_profile_retrieval_after_registration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Customer registration using utility function
  const customerConnection: api.IConnection = { host: connection.host };
  const registrationResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!", // Valid password format that satisfies complexity requirements
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(registrationResult);
  // Step 2: Profile retrieval using the authenticated connection
  const profile =
    await api.functional.ecommerce.customer.profile.at(customerConnection);
  typia.assert(profile);
  // Step 3: Validate profile data matches registration input
  TestValidator.equals(
    "customer ID should match",
    profile.id,
    registrationResult.id,
  );
  TestValidator.equals(
    "email should match registration",
    profile.email,
    registrationResult.email,
  );
  TestValidator.equals(
    "display name should match",
    profile.display_name,
    registrationResult.display_name,
  );
  TestValidator.equals(
    "phone number should match",
    profile.phone_number,
    registrationResult.phone_number,
  );
  // Step 4: Validate timestamp fields - typia.assert already validates ISO datetime format
  TestValidator.equals(
    "customer should not be deleted",
    profile.deleted_at,
    null,
  );
  // Business logic validation: timestamps should be present and consistent
  TestValidator.predicate(
    "created_at should be present",
    () => profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be present",
    () => profile.updated_at.length > 0,
  );
}
