import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function test_api_customer_shipping_address_create_default_switch(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const firstAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          isDefault: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(firstAddress);
  const secondAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          isDefault: false,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(secondAddress);
  TestValidator.predicate(
    "initial address should be default",
    firstAddress.isDefault,
  );
  TestValidator.predicate(
    "second address should not be default initially",
    !secondAddress.isDefault,
  );
  TestValidator.notEquals(
    "created addresses should differ",
    firstAddress.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "same customer profile should own both addresses",
    secondAddress.customerProfile,
    firstAddress.customerProfile,
  );
  const switchedAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          isDefault: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(switchedAddress);
  TestValidator.predicate(
    "new address must become default",
    switchedAddress.isDefault,
  );
  TestValidator.equals(
    "new address must keep the same customer profile",
    switchedAddress.customerProfile,
    firstAddress.customerProfile,
  );
  TestValidator.notEquals(
    "new default address should be a different record",
    switchedAddress.id,
    firstAddress.id,
  );
  TestValidator.notEquals(
    "new default address should be a different record from second address",
    switchedAddress.id,
    secondAddress.id,
  );
  const addresses = [firstAddress, secondAddress, switchedAddress];
  const defaultAddresses = addresses.filter((item) => item.isDefault);
  TestValidator.equals(
    "exactly one default address should remain",
    defaultAddresses.length,
    1,
  );
  TestValidator.equals(
    "the newest address should be the default one",
    defaultAddresses[0].id,
    switchedAddress.id,
  );
  TestValidator.equals(
    "old first address should no longer be default",
    firstAddress.isDefault,
    false,
  );
  TestValidator.equals(
    "old second address should stay non-default",
    secondAddress.isDefault,
    false,
  );
}
