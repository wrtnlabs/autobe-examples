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
 * Test successful update of a customer's shipping address fields.
 *
 * Scenario: A customer wants to update their saved shipping address with new information.
 *
 * Steps:
 * 1. Customer joins the platform and authenticates
 * 2. Customer creates a shipping address with initial values
 * 3. Customer updates the address with new recipient name, phone number,
 *    street address, city, state/province, postal code, and country
 * 4. System validates the customer owns the address
 * 5. System updates the address record with new values
 * 6. System sets the updated_at timestamp to current time
 * 7. System returns the updated address object with all fields
 *
 * Validation points:
 * - Response should contain the updated field values
 * - updated_at timestamp should be later than created_at
 * - The customer relationship should remain intact
 * - All address fields should reflect the new values
 */
export async function test_api_address_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication - create actor-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create initial shipping address
  const initialAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(initialAddress);
  // 3. Prepare update data with new values
  const updateData = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.paragraph({ sentences: 1 }),
    stateProvince: RandomGenerator.paragraph({ sentences: 1 }),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.pick(["USA", "Korea", "Japan", "China"] as const),
    isDefault: true,
  } satisfies IShoppingMallAddress.IUpdate;
  // 4. Update the address via API
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: updateData,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate all updated fields reflect the new values
  TestValidator.equals(
    "recipient name",
    updatedAddress.recipientName,
    updateData.recipientName,
  );
  TestValidator.equals(
    "phone number",
    updatedAddress.phoneNumber,
    updateData.phoneNumber,
  );
  TestValidator.equals(
    "street address",
    updatedAddress.streetAddress,
    updateData.streetAddress,
  );
  TestValidator.equals("city", updatedAddress.city, updateData.city);
  TestValidator.equals(
    "state province",
    updatedAddress.stateProvince,
    updateData.stateProvince,
  );
  TestValidator.equals(
    "postal code",
    updatedAddress.postalCode,
    updateData.postalCode,
  );
  TestValidator.equals("country", updatedAddress.country, updateData.country);
  // 6. Validate updated_at timestamp is later than created_at
  TestValidator.predicate(
    "updated at is later than created at",
    new Date(updatedAddress.updatedAt).getTime() >=
      new Date(initialAddress.createdAt).getTime(),
  );
  // 7. Validate customer relationship remains intact
  TestValidator.equals(
    "customer relationship remains same",
    updatedAddress.customer.id,
    initialAddress.customer.id,
  );
}
