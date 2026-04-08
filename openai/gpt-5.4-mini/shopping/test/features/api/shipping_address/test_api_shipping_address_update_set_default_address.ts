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

export async function test_api_shipping_address_update_set_default_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "Korea",
          is_default: true,
        },
      },
    );
  typia.assert(firstAddress);
  const secondAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "Korea",
          is_default: false,
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "first address starts as default",
    firstAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "second address starts as non-default",
    secondAddress.isDefault,
    false,
  );
  const updatedAddress =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId: secondAddress.id,
        body: {
          isDefault: true,
        } satisfies IMallPlatformShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.equals(
    "updated address becomes default",
    updatedAddress.isDefault,
    true,
  );
  TestValidator.equals(
    "updated address retains identity",
    updatedAddress.id,
    secondAddress.id,
  );
  TestValidator.notEquals(
    "the promoted address is a different record from the original default",
    updatedAddress.id,
    firstAddress.id,
  );
}
