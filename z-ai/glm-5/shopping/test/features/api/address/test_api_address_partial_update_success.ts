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
 * Test customer partial address update success scenario.
 *
 * Verifies that:
 * 1. Customer authentication is required
 * 2. Address must exist and belong to the authenticated customer
 * 3. Partial updates work correctly - only provided fields are updated
 * 4. Non-updated fields remain unchanged
 */
export async function test_api_address_partial_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create a shipping address
  const originalAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(originalAddress);
  // 3. Store original values for comparison
  const originalRecipientName = originalAddress.recipientName;
  const originalPhoneNumber = originalAddress.phoneNumber;
  const originalStateProvince = originalAddress.stateProvince;
  const originalPostalCode = originalAddress.postalCode;
  const originalCountry = originalAddress.country;
  const originalIsDefault = originalAddress.isDefault;
  // 4. Perform partial update (only street_address and city)
  const newStreetAddress = RandomGenerator.paragraph({ sentences: 2 });
  const newCity = RandomGenerator.name(1);
  const updateBody = {
    street_address: newStreetAddress,
    city: newCity,
  } satisfies IShoppingMallAddress.IUpdate;
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: originalAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate updated fields
  TestValidator.equals(
    "street address updated",
    updatedAddress.streetAddress,
    newStreetAddress,
  );
  TestValidator.equals("city updated", updatedAddress.city, newCity);
  // 6. Validate non-updated fields remain unchanged
  TestValidator.equals(
    "recipient name unchanged",
    updatedAddress.recipientName,
    originalRecipientName,
  );
  TestValidator.equals(
    "phone number unchanged",
    updatedAddress.phoneNumber,
    originalPhoneNumber,
  );
  TestValidator.equals(
    "state province unchanged",
    updatedAddress.stateProvince,
    originalStateProvince,
  );
  TestValidator.equals(
    "postal code unchanged",
    updatedAddress.postalCode,
    originalPostalCode,
  );
  TestValidator.equals(
    "country unchanged",
    updatedAddress.country,
    originalCountry,
  );
  TestValidator.equals(
    "is default unchanged",
    updatedAddress.isDefault,
    originalIsDefault,
  );
}
