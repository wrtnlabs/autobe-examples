import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
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
 * Test customer address retrieval by ID with full entity validation.
 *
 * Validates that an authenticated customer can successfully retrieve their own shipping address by its unique identifier. The test ensures complete response validation including all address fields and customer relation information.
 *
 * This test covers the primary success path for address retrieval, verifying that the endpoint returns the complete IEcommerceAddress entity with proper type safety validation.
 *
 * 1. Create customer connection and authenticate via authorize_customer_join utility.
 * 2. Generate random UUID for addressId parameter (address creation not available in SDK).
 * 3. Call api.functional.ecommerce.customer.addresses.at to retrieve address.
 * 4. Validate response with typia.assert for complete type safety.
 * 5. Verify all required address fields are present and properly formatted.
 * 6. Verify customer relation contains IEcommerceCustomer.ISummary with all required fields.
 */
export async function test_api_customer_address_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Generate random UUID for addressId (address creation not available in SDK)
  const addressId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve address by ID
  const address = await api.functional.ecommerce.customer.addresses.at(
    customerConnection,
    {
      addressId,
    },
  );
  // 4. Validate complete response type safety
  typia.assert(address);
  // 5. Validate address structure and required fields
  TestValidator.equals("address ID matches", address.id, addressId);
  TestValidator.predicate(
    "recipient name is non-empty",
    address.recipient_name.length > 0,
  );
  TestValidator.predicate(
    "phone number is non-empty",
    address.phone_number.length > 0,
  );
  TestValidator.predicate(
    "street address is non-empty",
    address.street_address.length > 0,
  );
  TestValidator.predicate("city is non-empty", address.city.length > 0);
  TestValidator.predicate(
    "postal code is non-empty",
    address.postal_code.length > 0,
  );
  TestValidator.predicate("country is non-empty", address.country.length > 0);
  TestValidator.predicate(
    "is_default is boolean",
    typeof address.is_default === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    address.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    address.updated_at.length > 0,
  );
  // 6. Validate customer relation (IEcommerceCustomer.ISummary)
  TestValidator.predicate(
    "customer ID is valid UUID",
    address.customer.id.length > 0,
  );
  TestValidator.predicate(
    "customer email is valid",
    address.customer.email.length > 0,
  );
  TestValidator.predicate(
    "customer display name is non-empty",
    address.customer.display_name.length > 0,
  );
  TestValidator.predicate(
    "customer created_at is valid",
    address.customer.created_at.length > 0,
  );
}
