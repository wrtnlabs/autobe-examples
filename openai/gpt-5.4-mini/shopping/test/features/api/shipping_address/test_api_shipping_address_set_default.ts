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

export async function test_api_shipping_address_set_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const defaultAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          is_default: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(defaultAddress);
  const targetAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(6),
          country: "South Korea",
          is_default: false,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(targetAddress);
  TestValidator.predicate(
    "initial default address is marked default",
    defaultAddress.isDefault,
  );
  TestValidator.predicate(
    "initial target address is not default",
    !targetAddress.isDefault,
  );
  TestValidator.notEquals(
    "created addresses should differ",
    defaultAddress.id,
    targetAddress.id,
  );
  const originalDefault = {
    recipientName: defaultAddress.recipientName,
    phoneNumber: defaultAddress.phoneNumber,
    streetAddress: defaultAddress.streetAddress,
    city: defaultAddress.city,
    stateProvince: defaultAddress.stateProvince,
    postalCode: defaultAddress.postalCode,
    country: defaultAddress.country,
  };
  const originalTarget = {
    recipientName: targetAddress.recipientName,
    phoneNumber: targetAddress.phoneNumber,
    streetAddress: targetAddress.streetAddress,
    city: targetAddress.city,
    stateProvince: targetAddress.stateProvince,
    postalCode: targetAddress.postalCode,
    country: targetAddress.country,
  };
  const updatedAddress =
    await api.functional.mallPlatform.customer.shipping_addresses._default.update(
      customerConnection,
      {
        shippingAddressId: targetAddress.id,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.equals(
    "updated address id should match target",
    updatedAddress.id,
    targetAddress.id,
  );
  TestValidator.predicate(
    "updated address is default",
    updatedAddress.isDefault,
  );
  TestValidator.equals(
    "recipient name preserved",
    updatedAddress.recipientName,
    originalTarget.recipientName,
  );
  TestValidator.equals(
    "phone number preserved",
    updatedAddress.phoneNumber,
    originalTarget.phoneNumber,
  );
  TestValidator.equals(
    "street address preserved",
    updatedAddress.streetAddress,
    originalTarget.streetAddress,
  );
  TestValidator.equals(
    "city preserved",
    updatedAddress.city,
    originalTarget.city,
  );
  TestValidator.equals(
    "state/province preserved",
    updatedAddress.stateProvince,
    originalTarget.stateProvince,
  );
  TestValidator.equals(
    "postal code preserved",
    updatedAddress.postalCode,
    originalTarget.postalCode,
  );
  TestValidator.equals(
    "country preserved",
    updatedAddress.country,
    originalTarget.country,
  );
  TestValidator.equals(
    "customer ownership preserved",
    updatedAddress.customer.id,
    targetAddress.customer.id,
  );
  TestValidator.equals(
    "exactly one address should remain default",
    [defaultAddress, updatedAddress].filter((address) => address.isDefault)
      .length,
    1,
  );
  TestValidator.predicate(
    "former default is no longer default",
    !defaultAddress.isDefault,
  );
  TestValidator.equals(
    "former default recipient preserved",
    defaultAddress.recipientName,
    originalDefault.recipientName,
  );
  TestValidator.equals(
    "former default phone preserved",
    defaultAddress.phoneNumber,
    originalDefault.phoneNumber,
  );
  TestValidator.equals(
    "former default street preserved",
    defaultAddress.streetAddress,
    originalDefault.streetAddress,
  );
  TestValidator.equals(
    "former default city preserved",
    defaultAddress.city,
    originalDefault.city,
  );
  TestValidator.equals(
    "former default state preserved",
    defaultAddress.stateProvince,
    originalDefault.stateProvince,
  );
  TestValidator.equals(
    "former default postal code preserved",
    defaultAddress.postalCode,
    originalDefault.postalCode,
  );
  TestValidator.equals(
    "former default country preserved",
    defaultAddress.country,
    originalDefault.country,
  );
}
