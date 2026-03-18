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

export async function test_api_customer_shipping_address_create(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const firstBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphabets(6),
    country: RandomGenerator.name(1),
    isDefault: true,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const firstAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      { body: firstBody },
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address recipient",
    firstAddress.recipientName,
    firstBody.recipientName,
  );
  TestValidator.equals(
    "first address phone",
    firstAddress.phoneNumber,
    firstBody.phoneNumber,
  );
  TestValidator.equals(
    "first address street",
    firstAddress.streetAddress,
    firstBody.streetAddress,
  );
  TestValidator.equals("first address city", firstAddress.city, firstBody.city);
  TestValidator.equals(
    "first address state",
    firstAddress.stateProvince,
    firstBody.stateProvince,
  );
  TestValidator.equals(
    "first address postal code",
    firstAddress.postalCode,
    firstBody.postalCode,
  );
  TestValidator.equals(
    "first address country",
    firstAddress.country,
    firstBody.country,
  );
  TestValidator.equals(
    "first address default flag",
    firstAddress.isDefault,
    firstBody.isDefault,
  );
  const secondBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphabets(6),
    country: RandomGenerator.name(1),
    isDefault: false,
  } satisfies IShoppingMallShippingAddress.ICreate;
  const secondAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      { body: secondBody },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address recipient",
    secondAddress.recipientName,
    secondBody.recipientName,
  );
  TestValidator.equals(
    "second address phone",
    secondAddress.phoneNumber,
    secondBody.phoneNumber,
  );
  TestValidator.equals(
    "second address street",
    secondAddress.streetAddress,
    secondBody.streetAddress,
  );
  TestValidator.equals(
    "second address city",
    secondAddress.city,
    secondBody.city,
  );
  TestValidator.equals(
    "second address state",
    secondAddress.stateProvince,
    secondBody.stateProvince,
  );
  TestValidator.equals(
    "second address postal code",
    secondAddress.postalCode,
    secondBody.postalCode,
  );
  TestValidator.equals(
    "second address country",
    secondAddress.country,
    secondBody.country,
  );
  TestValidator.equals(
    "second address default flag",
    secondAddress.isDefault,
    secondBody.isDefault,
  );
  TestValidator.equals(
    "second address ownership follows the same authenticated customer",
    secondAddress.customerProfile,
    firstAddress.customerProfile,
  );
  TestValidator.notEquals(
    "created addresses should be distinct",
    firstAddress.id,
    secondAddress.id,
  );
}
