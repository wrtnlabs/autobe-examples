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

export async function test_api_shipping_address_default_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password1234!",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const address =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(),
          is_default: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  const first =
    await api.functional.mallPlatform.customer.shipping_addresses._default.update(
      customerConnection,
      {
        shippingAddressId: address.id,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.customer.shipping_addresses._default.update(
      customerConnection,
      {
        shippingAddressId: address.id,
      },
    );
  typia.assert(second);
  TestValidator.equals("same shipping address id", first.id, address.id);
  TestValidator.equals(
    "same shipping address id on second call",
    second.id,
    address.id,
  );
  TestValidator.equals("still default on first call", first.isDefault, true);
  TestValidator.equals("still default on second call", second.isDefault, true);
  TestValidator.equals(
    "same owner customer id on first call",
    first.customer.id,
    address.customer.id,
  );
  TestValidator.equals(
    "same owner customer id on second call",
    second.customer.id,
    address.customer.id,
  );
  TestValidator.equals(
    "same recipient name on first call",
    first.recipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "same recipient name on second call",
    second.recipientName,
    address.recipientName,
  );
  TestValidator.equals(
    "same phone number on first call",
    first.phoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "same phone number on second call",
    second.phoneNumber,
    address.phoneNumber,
  );
  TestValidator.equals(
    "same street address on first call",
    first.streetAddress,
    address.streetAddress,
  );
  TestValidator.equals(
    "same street address on second call",
    second.streetAddress,
    address.streetAddress,
  );
  TestValidator.equals("same city on first call", first.city, address.city);
  TestValidator.equals("same city on second call", second.city, address.city);
  TestValidator.equals(
    "same state province on first call",
    first.stateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "same state province on second call",
    second.stateProvince,
    address.stateProvince,
  );
  TestValidator.equals(
    "same postal code on first call",
    first.postalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "same postal code on second call",
    second.postalCode,
    address.postalCode,
  );
  TestValidator.equals(
    "same country on first call",
    first.country,
    address.country,
  );
  TestValidator.equals(
    "same country on second call",
    second.country,
    address.country,
  );
  TestValidator.equals(
    "second call remains idempotent",
    second,
    first,
    (key) => key === "updatedAt",
  );
}
