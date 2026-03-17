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

export async function test_api_shipping_address_delete_owned_entry(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssword1234!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized: IShoppingMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "authorized customer email matches join input",
    authorized.email,
    joinBody.email,
  );
  const defaultAddressBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    is_default: true,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const defaultAddress: IShoppingMallShippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: defaultAddressBody,
      },
    );
  typia.assert(defaultAddress);
  const preservedAddressBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 3 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(8),
    country: RandomGenerator.name(1),
    is_default: false,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const preservedAddress: IShoppingMallShippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: preservedAddressBody,
      },
    );
  typia.assert(preservedAddress);
  TestValidator.notEquals(
    "created shipping addresses must be distinct",
    defaultAddress.id,
    preservedAddress.id,
  );
  TestValidator.equals(
    "target address is initially default",
    defaultAddress.is_default,
    true,
  );
  TestValidator.equals(
    "preserved address is initially not default",
    preservedAddress.is_default,
    false,
  );
  await api.functional.shoppingMall.customer.shippingAddresses.erase(
    customerConnection,
    {
      addressId: defaultAddress.id,
    },
  );
}
