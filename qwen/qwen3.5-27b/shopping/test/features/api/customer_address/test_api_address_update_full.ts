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
 * Test the primary success path for updating a customer's shipping address with all fields.
 *
 * Validates the complete address update flow including customer authentication, address creation, and full field updates. Ensures that all mutable address fields can be updated successfully while system-managed fields remain protected.
 *
 * Special attention is given to verifying that system-managed fields (id, created_at, deleted_at) remain unchanged, while updated_at is properly refreshed to reflect the modification time.
 *
 * 1. Customer registers and authenticates to establish session.
 * 2. Customer creates a new shipping address with initial data.
 * 3. Customer updates all address fields with new values.
 * 4. Validates that updated fields match the new input values.
 * 5. Validates that system-managed fields remain unchanged.
 * 6. Validates that updated_at timestamp is more recent than created_at.
 */
export async function test_api_address_update_full(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: undefined,
  });
  // 2. Create initial address
  const initialAddress: IShoppingMallCustomerAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(initialAddress);
  // Capture initial values for validation
  const initialCreatedAt: string = initialAddress.created_at;
  const initialIsDefault: boolean = initialAddress.is_default;
  const initialId: string = initialAddress.id;
  // 3. Update address with new values for all fields
  const updateBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(),
    state_province: RandomGenerator.alphabets(3),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.name(),
  } satisfies IShoppingMallCustomerAddress.IUpdate;
  const updatedAddress: IShoppingMallCustomerAddress =
    await api.functional.shoppingMall.customer.customers.me.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  // 4. Validate updated fields match new values
  TestValidator.equals(
    "recipient_name updated",
    updatedAddress.recipient_name,
    updateBody.recipient_name,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedAddress.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "street_address updated",
    updatedAddress.street_address,
    updateBody.street_address,
  );
  TestValidator.equals("city updated", updatedAddress.city, updateBody.city);
  TestValidator.equals(
    "state_province updated",
    updatedAddress.state_province,
    updateBody.state_province,
  );
  TestValidator.equals(
    "postal_code updated",
    updatedAddress.postal_code,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    updateBody.country,
  );
  // 5. Validate system-managed fields remain unchanged
  TestValidator.equals("id unchanged", updatedAddress.id, initialId);
  TestValidator.equals(
    "created_at unchanged",
    updatedAddress.created_at,
    initialCreatedAt,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedAddress.deleted_at,
    initialAddress.deleted_at,
  );
  TestValidator.equals(
    "is_default unchanged",
    updatedAddress.is_default,
    initialIsDefault,
  );
  // 6. Validate updated_at is more recent than created_at
  TestValidator.predicate(
    "updated_at is more recent than created_at",
    new Date(updatedAddress.updated_at).getTime() >
      new Date(initialCreatedAt).getTime(),
  );
}
