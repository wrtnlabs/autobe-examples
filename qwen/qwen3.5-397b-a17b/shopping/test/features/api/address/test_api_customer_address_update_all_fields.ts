import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_customer_address_update_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Create initial address with all required fields
  const initialAddress =
    await generate_random_shopping_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          recipientPhone: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state: RandomGenerator.name(),
          postalCode: RandomGenerator.alphaNumeric(5),
          country: RandomGenerator.name(),
          isDefault: true,
        } satisfies IShoppingMallAddress.ICreate,
      },
    );
  typia.assert(initialAddress);
  // 3. Prepare update data with new values for all fields
  const updateInput = {
    recipientName: RandomGenerator.name(),
    recipientPhone: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(),
    state: RandomGenerator.name(),
    postalCode: RandomGenerator.alphaNumeric(5),
    country: RandomGenerator.name(),
    isDefault: false,
  } satisfies IShoppingMallAddress.IUpdate;
  // 4. Update address with new values for all fields
  const updatedAddress =
    await api.functional.shoppingMall.customer.addresses.update(
      customerConnection,
      {
        addressId: initialAddress.id,
        body: updateInput,
      },
    );
  typia.assert(updatedAddress);
  // 5. Validate all fields are updated correctly
  TestValidator.equals(
    "recipient name updated",
    updatedAddress.recipient_name,
    updateInput.recipientName,
  );
  TestValidator.equals(
    "recipient phone updated",
    updatedAddress.recipient_phone,
    updateInput.recipientPhone,
  );
  TestValidator.equals(
    "street address updated",
    updatedAddress.street_address,
    updateInput.streetAddress,
  );
  TestValidator.equals("city updated", updatedAddress.city, updateInput.city);
  TestValidator.equals(
    "state updated",
    updatedAddress.state,
    updateInput.state,
  );
  TestValidator.equals(
    "postal code updated",
    updatedAddress.postal_code,
    updateInput.postalCode,
  );
  TestValidator.equals(
    "country updated",
    updatedAddress.country,
    updateInput.country,
  );
  TestValidator.equals(
    "is_default updated",
    updatedAddress.is_default,
    updateInput.isDefault,
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialAddress.updated_at,
    updatedAddress.updated_at,
  );
  TestValidator.equals(
    "address id preserved",
    updatedAddress.id,
    initialAddress.id,
  );
}