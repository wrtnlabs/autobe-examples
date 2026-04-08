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

export async function test_api_shipping_address_create_default_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ChangeMe123!",
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    country: "South Korea",
    is_default: true,
  } satisfies IMallPlatformShippingAddress.ICreate;
  const firstAddress =
    await api.functional.mallPlatform.customer.shipping_addresses.create(
      customerConnection,
      {
        body: firstBody,
      },
    );
  typia.assert(firstAddress);
  TestValidator.equals(
    "first address recipient name",
    firstAddress.recipientName,
    firstBody.recipient_name,
  );
  TestValidator.equals(
    "first address phone number",
    firstAddress.phoneNumber,
    firstBody.phone_number,
  );
  TestValidator.equals(
    "first address street address",
    firstAddress.streetAddress,
    firstBody.street_address,
  );
  TestValidator.equals("first address city", firstAddress.city, firstBody.city);
  TestValidator.equals(
    "first address state province",
    firstAddress.stateProvince,
    firstBody.state_province,
  );
  TestValidator.equals(
    "first address postal code",
    firstAddress.postalCode,
    firstBody.postal_code,
  );
  TestValidator.equals(
    "first address country",
    firstAddress.country,
    firstBody.country,
  );
  TestValidator.predicate(
    "first address is default",
    firstAddress.isDefault === true,
  );
  TestValidator.equals(
    "first address owner id",
    firstAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "first address owner email",
    firstAddress.customer.email,
    authorized.email,
  );
  const secondBody = {
    recipient_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    street_address: RandomGenerator.paragraph({ sentences: 2 }),
    city: RandomGenerator.name(1),
    state_province: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphabets(5),
    country: "South Korea",
    is_default: true,
  } satisfies IMallPlatformShippingAddress.ICreate;
  const secondAddress =
    await api.functional.mallPlatform.customer.shipping_addresses.create(
      customerConnection,
      {
        body: secondBody,
      },
    );
  typia.assert(secondAddress);
  TestValidator.equals(
    "second address recipient name",
    secondAddress.recipientName,
    secondBody.recipient_name,
  );
  TestValidator.equals(
    "second address phone number",
    secondAddress.phoneNumber,
    secondBody.phone_number,
  );
  TestValidator.equals(
    "second address street address",
    secondAddress.streetAddress,
    secondBody.street_address,
  );
  TestValidator.equals(
    "second address city",
    secondAddress.city,
    secondBody.city,
  );
  TestValidator.equals(
    "second address state province",
    secondAddress.stateProvince,
    secondBody.state_province,
  );
  TestValidator.equals(
    "second address postal code",
    secondAddress.postalCode,
    secondBody.postal_code,
  );
  TestValidator.equals(
    "second address country",
    secondAddress.country,
    secondBody.country,
  );
  TestValidator.predicate(
    "second address is default",
    secondAddress.isDefault === true,
  );
  TestValidator.equals(
    "second address owner id",
    secondAddress.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "second address owner email",
    secondAddress.customer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "addresses are different records",
    firstAddress.id !== secondAddress.id,
  );
}
