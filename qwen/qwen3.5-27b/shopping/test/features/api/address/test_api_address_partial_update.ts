import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";

/**
 * Test partial address update where only some fields are modified.
 *
 * Validates that the address update endpoint correctly handles partial updates, modifying only the provided fields while preserving all other address data. Ensures that the updated_at timestamp is refreshed on modification.
 *
 * Special attention is given to verifying that fields not included in the update request remain unchanged, confirming the partial update functionality works as expected.
 *
 * 1. Register and authenticate as a customer
 * 2. Create a new shipping address with complete initial data
 * 3. Store original address data for comparison
 * 4. Update only phone_number and city fields
 * 5. Verify updated fields reflect new values
 * 6. Verify unchanged fields match original values
 * 7. Verify updated_at timestamp is more recent than created_at
 */
export async function test_api_address_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a new shipping address with complete initial data
  const originalAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(originalAddress);
  // 3. Store original data for comparison
  const originalRecipientName = originalAddress.recipient_name;
  const originalPhoneNumber = originalAddress.phone_number;
  const originalStreetAddress = originalAddress.street_address;
  const originalCity = originalAddress.city;
  const originalStateProvince = originalAddress.state_province;
  const originalPostalCode = originalAddress.postal_code;
  const originalCountry = originalAddress.country;
  const originalCreatedAt = originalAddress.created_at;
  const originalUpdatedAt = originalAddress.updated_at;
  // 4. Update only phone_number and city fields
  const newPhoneNumber = RandomGenerator.mobile();
  const newCity = RandomGenerator.name();
  const updatedAddress =
    await api.functional.shoppingMall.customer.customers.me.addresses.update(
      customerConnection,
      {
        addressId: originalAddress.id,
        body: {
          phone_number: newPhoneNumber,
          city: newCity,
        } satisfies IShoppingMallCustomerAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  // 5. Verify updated fields reflect new values
  TestValidator.equals(
    "phone_number updated",
    updatedAddress.phone_number,
    newPhoneNumber,
  );
  TestValidator.equals("city updated", updatedAddress.city, newCity);
  // 6. Verify unchanged fields match original values
  TestValidator.equals(
    "recipient_name unchanged",
    updatedAddress.recipient_name,
    originalRecipientName,
  );
  TestValidator.equals(
    "street_address unchanged",
    updatedAddress.street_address,
    originalStreetAddress,
  );
  TestValidator.equals(
    "state_province unchanged",
    updatedAddress.state_province,
    originalStateProvince,
  );
  TestValidator.equals(
    "postal_code unchanged",
    updatedAddress.postal_code,
    originalPostalCode,
  );
  TestValidator.equals(
    "country unchanged",
    updatedAddress.country,
    originalCountry,
  );
  // 7. Verify updated_at timestamp is more recent than created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedAddress.updated_at).getTime() >
      new Date(originalCreatedAt).getTime(),
  );
  // 8. Verify updated_at changed from original
  TestValidator.notEquals(
    "updated_at changed",
    updatedAddress.updated_at,
    originalUpdatedAt,
  );
}
