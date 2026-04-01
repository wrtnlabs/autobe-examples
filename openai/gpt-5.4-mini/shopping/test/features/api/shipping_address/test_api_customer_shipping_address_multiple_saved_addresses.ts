import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_shipping_addresses_create } from "../../../generate/generate_random_mall_platform_customer_shipping_addresses_create";
import { prepare_random_mall_platform_shipping_address } from "../../../prepare/prepare_random_mall_platform_shipping_address";

export async function test_api_customer_shipping_address_multiple_saved_addresses(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.name(1),
  } satisfies IMallPlatformShippingAddress.ICreate;
  const firstAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(firstAddress);
  const secondBody = {
    recipientName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
    streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    stateProvince: RandomGenerator.name(1),
    postalCode: RandomGenerator.alphaNumeric(6),
    country: RandomGenerator.name(1),
  } satisfies IMallPlatformShippingAddress.ICreate;
  const secondAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: secondBody,
      },
    );
  typia.assert(secondAddress);
  TestValidator.notEquals(
    "saved addresses should have different ids",
    firstAddress.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "first recipient should persist",
    firstAddress.recipientName,
    firstBody.recipientName,
  );
  TestValidator.equals(
    "first phone number should persist",
    firstAddress.phoneNumber,
    firstBody.phoneNumber,
  );
  TestValidator.equals(
    "first street address should persist",
    firstAddress.streetAddress,
    firstBody.streetAddress,
  );
  TestValidator.equals(
    "first city should persist",
    firstAddress.city,
    firstBody.city,
  );
  TestValidator.equals(
    "first state/province should persist",
    firstAddress.stateProvince,
    firstBody.stateProvince,
  );
  TestValidator.equals(
    "first postal code should persist",
    firstAddress.postalCode,
    firstBody.postalCode,
  );
  TestValidator.equals(
    "first country should persist",
    firstAddress.country,
    firstBody.country,
  );
  TestValidator.equals(
    "second recipient should persist",
    secondAddress.recipientName,
    secondBody.recipientName,
  );
  TestValidator.equals(
    "second phone number should persist",
    secondAddress.phoneNumber,
    secondBody.phoneNumber,
  );
  TestValidator.equals(
    "second street address should persist",
    secondAddress.streetAddress,
    secondBody.streetAddress,
  );
  TestValidator.equals(
    "second city should persist",
    secondAddress.city,
    secondBody.city,
  );
  TestValidator.equals(
    "second state/province should persist",
    secondAddress.stateProvince,
    secondBody.stateProvince,
  );
  TestValidator.equals(
    "second postal code should persist",
    secondAddress.postalCode,
    secondBody.postalCode,
  );
  TestValidator.equals(
    "second country should persist",
    secondAddress.country,
    secondBody.country,
  );
  TestValidator.equals(
    "both addresses should belong to the same customer",
    firstAddress.customer.id,
    secondAddress.customer.id,
  );
}
