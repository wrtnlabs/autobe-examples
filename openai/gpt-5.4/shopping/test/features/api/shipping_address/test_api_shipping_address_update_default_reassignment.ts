import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_shipping_address_update_default_reassignment(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const targetAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
          is_default: false,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(targetAddress);
  const previousDefaultAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
          is_default: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(previousDefaultAddress);
  TestValidator.equals(
    "previous default address starts as default",
    previousDefaultAddress.is_default,
    true,
  );
  TestValidator.equals(
    "target address starts as non-default",
    targetAddress.is_default,
    false,
  );
  const updateBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 4 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(10),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IShoppingMallShippingAddress.IUpdate;
  const updatedAddress =
    await api.functional.shoppingMall.customer.shippingAddresses.update(
      customerConnection,
      {
        addressId: targetAddress.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.equals(
    "updated address keeps same id",
    updatedAddress.id,
    targetAddress.id,
  );
  TestValidator.equals(
    "recipient name replaced",
    updatedAddress.recipient_name,
    updateBody.recipient_name,
  );
  TestValidator.equals(
    "phone number replaced",
    updatedAddress.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "street address replaced",
    updatedAddress.street_address,
    updateBody.street_address,
  );
  TestValidator.equals("city replaced", updatedAddress.city, updateBody.city);
  TestValidator.equals(
    "state province replaced",
    updatedAddress.state_province,
    updateBody.state_province,
  );
  TestValidator.equals(
    "postal code replaced",
    updatedAddress.postal_code,
    updateBody.postal_code,
  );
  TestValidator.equals(
    "country replaced",
    updatedAddress.country,
    updateBody.country,
  );
  TestValidator.equals(
    "updated address becomes default",
    updatedAddress.is_default,
    true,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedAddress.created_at,
    targetAddress.created_at,
  );
  TestValidator.notEquals(
    "updated_at changes after update",
    updatedAddress.updated_at,
    targetAddress.updated_at,
  );
}
