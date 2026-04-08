import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_shipping_address_set_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
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
        },
      },
    );
  typia.assert(firstAddress);
  const secondAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
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
        },
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "the target address should initially not be default",
    secondAddress.isDefault,
    false,
  );
  TestValidator.equals(
    "the initially created default address should be default before the update",
    firstAddress.isDefault,
    true,
  );
  const originalTarget = {
    customerId: secondAddress.customer.id,
    recipientName: secondAddress.recipientName,
    phoneNumber: secondAddress.phoneNumber,
    streetAddress: secondAddress.streetAddress,
    city: secondAddress.city,
    stateProvince: secondAddress.stateProvince,
    postalCode: secondAddress.postalCode,
    country: secondAddress.country,
    deletedAt: secondAddress.deletedAt,
  };
  const updated =
    await api.functional.mallPlatform.customer.shipping_addresses._default.update(
      customerConnection,
      {
        shippingAddressId: secondAddress.id,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated address id should match target",
    updated.id,
    secondAddress.id,
  );
  TestValidator.equals(
    "updated address should belong to the same customer",
    updated.customer.id,
    originalTarget.customerId,
  );
  TestValidator.equals(
    "recipient name should remain unchanged",
    updated.recipientName,
    originalTarget.recipientName,
  );
  TestValidator.equals(
    "phone number should remain unchanged",
    updated.phoneNumber,
    originalTarget.phoneNumber,
  );
  TestValidator.equals(
    "street address should remain unchanged",
    updated.streetAddress,
    originalTarget.streetAddress,
  );
  TestValidator.equals(
    "city should remain unchanged",
    updated.city,
    originalTarget.city,
  );
  TestValidator.equals(
    "state/province should remain unchanged",
    updated.stateProvince,
    originalTarget.stateProvince,
  );
  TestValidator.equals(
    "postal code should remain unchanged",
    updated.postalCode,
    originalTarget.postalCode,
  );
  TestValidator.equals(
    "country should remain unchanged",
    updated.country,
    originalTarget.country,
  );
  TestValidator.equals(
    "deletedAt should remain unchanged",
    updated.deletedAt,
    originalTarget.deletedAt,
  );
  TestValidator.equals(
    "default flag should become true",
    updated.isDefault,
    true,
  );
  TestValidator.equals(
    "the original created default snapshot should still be true in memory",
    firstAddress.isDefault,
    true,
  );
}
