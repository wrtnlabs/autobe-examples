import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";

/**
 * Test updating all fields of a customer shipping address.
 *
 * Validates that a customer can update all fields of an existing shipping address via the PUT endpoint. Ensures each field is correctly persisted and that the timestamp reflects the modification while identity fields remain unchanged.
 *
 * 1. Customer joins the platform and gets authenticated.
 * 2. Customer creates an initial shipping address.
 * 3. Customer updates every field of the address with new values.
 * 4. Validates that updated fields match, updated_at advances, and id stays unchanged.
 */
export async function test_api_customer_address_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create an initial address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 3. Update all fields with new values
  const updateInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.name(),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.name(),
    is_default: false,
  } satisfies IECommerceMallCustomerAddress.IUpdate;
  const updated = await api.functional.eCommerceMall.customer.addresses.update(
    customerConnection,
    {
      addressId: address.id,
      body: updateInput,
    },
  );
  typia.assert(updated);
  // 4. Validate updated fields match input
  TestValidator.equals(
    "recipient_name",
    updated.recipient_name,
    updateInput.recipient_name,
  );
  TestValidator.equals(
    "phone_number",
    updated.phone_number,
    updateInput.phone_number,
  );
  TestValidator.equals(
    "street_address",
    updated.street_address,
    updateInput.street_address,
  );
  TestValidator.equals("city", updated.city, updateInput.city);
  TestValidator.equals(
    "state_province",
    updated.state_province,
    updateInput.state_province,
  );
  TestValidator.equals(
    "postal_code",
    updated.postal_code,
    updateInput.postal_code,
  );
  TestValidator.equals("country", updated.country, updateInput.country);
  TestValidator.equals(
    "is_default",
    updated.is_default,
    updateInput.is_default,
  );
  // 5. Validate id unchanged
  TestValidator.equals("id unchanged", updated.id, address.id);
  // 6. Validate updated_at advanced
  TestValidator.predicate(
    "updated_at advanced",
    () =>
      new Date(updated.updated_at).getTime() >
      new Date(address.updated_at).getTime(),
  );
}
