import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer } from "../../../prepare/prepare_random_ecommerce_mall_customer";

/**
 * Test successful address update for the authenticated customer.
 * 1. Authenticate as a customer using join
 * 2. Create a new address using POST /customer/addresses
 * 3. Update the address using PUT /customer/addresses/{addressId} with all required fields
 * 4. Verify the response contains the updated address with all field values changed
 * 5. Confirm the updatedAt timestamp reflects the modification time
 */
export async function test_api_customer_address_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create initial address using utility function
  const originalAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(originalAddress);
  // 3. Prepare complete update payload with different values
  const updateBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: `${RandomGenerator.alphabets(3)} ${RandomGenerator.pick(["Street", "Avenue", "Road", "Boulevard"])} ${RandomGenerator.alphaNumeric(3)}`,
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.pick([
      "USA",
      "Canada",
      "United Kingdom",
      "Germany",
      "France",
      "Japan",
    ]),
  } satisfies IEcommerceMallCustomer.IUpdate;
  // 4. Update the address using SDK (no utility available for PUT endpoint)
  const updatedAddress =
    await api.functional.ecommerceMall.customer.addresses.update(
      customerConnection,
      {
        addressId: originalAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 5. Verify ID unchanged (same entity)
  TestValidator.equals(
    "address ID unchanged after update",
    updatedAddress.id,
    originalAddress.id,
  );
  // 6. Verify all fields updated to new values
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipientName,
    updateBody.recipientName,
  );
  TestValidator.equals(
    "phone number updated",
    updatedAddress.phoneNumber,
    updateBody.phoneNumber,
  );
  TestValidator.equals(
    "street address updated",
    updatedAddress.streetAddress,
    updateBody.streetAddress,
  );
  TestValidator.equals("city updated", updatedAddress.city, updateBody.city);
  TestValidator.equals("state updated", updatedAddress.state, updateBody.state);
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postalCode,
    updateBody.postalCode,
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    updateBody.country,
  );
  // 7. Verify isDefault persisted (should match original or be set based on business rules)
  TestValidator.equals(
    "isDefault flag persisted",
    updatedAddress.isDefault,
    originalAddress.isDefault,
  );
  // 8. Verify timestamps are valid and updatedAt reflects modification
  TestValidator.predicate(
    "createdAt is valid timestamp",
    !Number.isNaN(new Date(updatedAddress.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is valid timestamp",
    !Number.isNaN(new Date(updatedAddress.updatedAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt reflects modification time",
    new Date(updatedAddress.updatedAt).getTime() >=
      new Date(originalAddress.createdAt).getTime(),
  );
}
