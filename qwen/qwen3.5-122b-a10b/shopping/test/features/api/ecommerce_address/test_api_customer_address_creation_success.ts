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
import { generate_random_ecommerce_customer_addresses_create } from "../../../generate/generate_random_ecommerce_customer_addresses_create";
import { prepare_random_ecommerce_address } from "../../../prepare/prepare_random_ecommerce_address";

/**
 * Test successful creation of a new shipping address for an authenticated customer.
 *
 * Validates the complete address creation workflow including customer authentication, address data submission, and response validation. Ensures that the address record is properly associated with the customer and all required fields are correctly stored and returned.
 *
 * Special attention is given to verifying that optional fields like state can be omitted, default values are properly applied, and the response includes complete customer reference information with all timestamps correctly populated.
 *
 * 1. Customer registers with valid credentials to obtain authentication token.
 * 2. Customer creates a new shipping address with all required fields.
 * 3. State field is omitted to test optional field handling.
 * 4. is_default field is not set to verify default value of false.
 * 5. Validates response contains complete address object with customer reference.
 * 6. Verifies all address components match the input data.
 * 7. Confirms generated ID, timestamps, and deleted_at=null are present.
 */
export async function test_api_customer_address_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
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
  // 2. Prepare address input data
  const inputAddress = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    postal_code: RandomGenerator.alphabets(5),
    country: "KR",
  } satisfies IEcommerceAddress.ICreate;
  // 3. Create address with all required fields, omitting optional state
  const address = await generate_random_ecommerce_customer_addresses_create(
    customerConnection,
    {
      body: inputAddress,
    },
  );
  typia.assert(address);
  // 4. Validate response structure matches input
  TestValidator.equals(
    "recipient name matches",
    address.recipient_name,
    inputAddress.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    address.phone_number,
    inputAddress.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    address.street_address,
    inputAddress.street_address,
  );
  TestValidator.equals("city matches", address.city, inputAddress.city);
  TestValidator.equals(
    "postal code matches",
    address.postal_code,
    inputAddress.postal_code,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    inputAddress.country,
  );
  TestValidator.equals(
    "is_default defaults to false",
    address.is_default,
    false,
  );
  TestValidator.equals("deleted_at is null", address.deleted_at, null);
  // 5. Validate customer reference
  TestValidator.equals("customer ID matches", address.customer.id, customer.id);
  TestValidator.equals(
    "customer display name matches",
    address.customer.display_name,
    customer.display_name,
  );
  // 6. Validate ID is UUID format
  TestValidator.equals(
    "address ID is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      address.id,
    ),
    true,
  );
  // 7. Validate timestamps exist and are valid
  TestValidator.predicate(
    "created_at exists",
    address.created_at !== null && address.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    address.updated_at !== null && address.updated_at !== undefined,
  );
}
