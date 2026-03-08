import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

/**
 * Test that when a customer creates their first shipping address, the system
 * automatically sets it as the default regardless of the is_default value in
 * the request.
 *
 * Business Rule: First address must automatically become the default for
 * checkout convenience.
 */
export async function test_api_address_first_address_auto_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform (no existing addresses)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Create first address with is_default = false to test auto-default behavior
  const addressInput = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.name(1),
    is_default: false,
  } satisfies IShoppingMallAddress.ICreate;
  const address = await api.functional.shoppingMall.customer.addresses.create(
    customerConnection,
    { body: addressInput },
  );
  typia.assert(address);
  // 3. Verify is_default is true (auto-set for first address)
  TestValidator.equals(
    "first address should auto-default",
    address.isDefault,
    true,
  );
  // 4. Verify all address fields are correctly stored
  TestValidator.equals(
    "recipient name matches",
    address.recipientName,
    addressInput.recipient_name,
  );
  TestValidator.equals(
    "phone number matches",
    address.phoneNumber,
    addressInput.phone_number,
  );
  TestValidator.equals(
    "street address matches",
    address.streetAddress,
    addressInput.street_address,
  );
  TestValidator.equals("city matches", address.city, addressInput.city);
  TestValidator.equals(
    "state province matches",
    address.stateProvince,
    addressInput.state_province,
  );
  TestValidator.equals(
    "postal code matches",
    address.postalCode,
    addressInput.postal_code,
  );
  TestValidator.equals(
    "country matches",
    address.country,
    addressInput.country,
  );
  // 5. Verify address is associated with the correct customer
  TestValidator.equals("customer id matches", address.customer.id, customer.id);
  TestValidator.equals(
    "customer email matches",
    address.customer.email,
    customer.email,
  );
  // 6. Verify timestamps are set and deleted_at is null
  TestValidator.predicate("created_at is set", address.createdAt.length > 0);
  TestValidator.predicate("updated_at is set", address.updatedAt.length > 0);
  TestValidator.equals("deleted_at is null", address.deletedAt, null);
}
