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
 * Test updating a customer's shipping address with new recipient and location information.
 *
 * Validates the customer address update functionality by creating an address, modifying all editable fields, and confirming the system correctly persists the changes while maintaining data integrity.
 *
 * The test exercises the complete update workflow including authentication, address creation, field modification, and response validation. Special attention is given to verifying that the updated_at timestamp reflects the modification and that customer ownership remains intact.
 *
 * 1. Customer registers and authenticates with the system.
 * 2. Customer creates a new shipping address with initial data.
 * 3. Customer submits an update request with modified address fields.
 * 4. System validates all required fields and persists changes.
 * 5. Response contains updated address entity with new timestamp.
 * 6. Validation confirms all fields match the update request.
 * 7. Validation confirms updated_at is newer than created_at.
 */
export async function test_api_address_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create initial address
  const originalAddress =
    await generate_random_ecommerce_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(1),
          is_default: false,
        } satisfies IEcommerceAddress.ICreate,
      },
    );
  typia.assert(originalAddress);
  // 3. Prepare update data with all fields modified
  const updateBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IEcommerceAddress.IUpdate;
  // 4. Update the address
  const updatedAddress =
    await api.functional.ecommerce.customer.addresses.update(
      customerConnection,
      {
        addressId: originalAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate response structure
  TestValidator.equals(
    "address ID preserved",
    updatedAddress.id,
    originalAddress.id,
  );
  TestValidator.equals(
    "customer ID preserved",
    updatedAddress.customer.id,
    customer.id,
  );
  // 6. Validate all updated fields match the request
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipient_name,
    updateBody.recipient_name,
  );
  TestValidator.equals(
    "phone number updated",
    updatedAddress.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "street address updated",
    updatedAddress.street_address,
    updateBody.street_address,
  );
  TestValidator.equals("city updated", updatedAddress.city, updateBody.city);
  TestValidator.equals("state updated", updatedAddress.state, updateBody.state);
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postal_code,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    updateBody.country,
  );
  TestValidator.equals(
    "is_default updated",
    updatedAddress.is_default,
    updateBody.is_default,
  );
  // 7. Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    originalAddress.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    updatedAddress.updated_at !== null,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedAddress.updated_at).getTime() >=
      new Date(originalAddress.created_at).getTime(),
  );
}
