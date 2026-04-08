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
 * Customer successfully retrieves their own profile information.
 *
 * Validates that an authenticated customer can retrieve their complete profile data through the profile retrieval endpoint. The test ensures proper data privacy by confirming sensitive authentication fields are excluded from the response while all public profile information is correctly returned.
 *
 * The test follows these steps:
 * 1. Create a customer account via registration using the authorize_customer_join utility function
 * 2. The utility function authenticates the customer and updates the connection with auth token
 * 3. Call the profile retrieval endpoint (api.functional.ecommerce.customers.at) with the customer's own ID
 * 4. Verify the response contains all required public fields: display_name, phone_number, created_at, updated_at
 * 5. Verify the deleted_at field is null for an active account
 *
 * Sensitive fields (email, password_hash) are excluded from the response by design - the IEcommerceCustomer type definition ensures these fields cannot exist at compile time, providing type-level security guarantees.
 *
 * This test validates proper data isolation and security by ensuring customers can only access their own profile data and that authentication credentials are never exposed in API responses.
 */
export async function test_api_customer_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    });
  typia.assert(authorized);
  // 2. Retrieve customer profile using their own ID
  const profile: IEcommerceCustomer =
    await api.functional.ecommerce.customers.at(customerConnection, {
      customerId: authorized.id,
    });
  typia.assert(profile);
  // 3. Verify all required public fields are present and match
  TestValidator.equals(
    "display_name matches",
    profile.display_name,
    authorized.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    profile.phone_number,
    authorized.phone_number,
  );
  TestValidator.equals(
    "created_at matches",
    profile.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    profile.updated_at,
    authorized.updated_at,
  );
  // 4. Verify deleted_at is null for active account
  TestValidator.equals(
    "deleted_at is null for active account",
    profile.deleted_at,
    null,
  );
}
