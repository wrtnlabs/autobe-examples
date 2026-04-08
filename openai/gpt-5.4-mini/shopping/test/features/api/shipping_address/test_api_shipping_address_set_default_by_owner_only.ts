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

export async function test_api_shipping_address_set_default_by_owner_only(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: `https://example.com/register/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await generate_random_mall_platform_customer_shipping_addresses_create(
    customerAConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
        city: RandomGenerator.name(),
        stateProvince: RandomGenerator.name(),
        postalCode: RandomGenerator.alphaNumeric(8),
        country: RandomGenerator.name(),
        isDefault: true,
      } satisfies IMallPlatformShippingAddress.ICreate,
    },
  );
  const foreignAddress =
    await generate_random_mall_platform_customer_shipping_addresses_create(
      customerBConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(),
          stateProvince: RandomGenerator.name(),
          postalCode: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(),
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(foreignAddress);
  await TestValidator.httpError(
    "cannot set another customer's shipping address as default",
    [403, 404],
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses._default.update(
        customerAConnection,
        {
          shippingAddressId: foreignAddress.id,
        },
      );
    },
  );
}
