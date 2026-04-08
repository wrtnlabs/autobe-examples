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

export async function test_api_customer_shipping_address_retrieve_deleted_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string &
        tags.Format<"email">,
      password: "password123!" as string & tags.Format<"password">,
      href: "https://example.com/register" as string & tags.Format<"uri">,
      referrer: "https://example.com/landing" as string & tags.Format<"uri">,
      ip: null,
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
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphabets(6),
          country: RandomGenerator.name(1),
          is_default: true,
        } satisfies IMallPlatformShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  await api.functional.mallPlatform.customer.shipping_addresses.erase(
    customerConnection,
    {
      shippingAddressId: address.id,
    },
  );
  await TestValidator.httpError(
    "deleted shipping address should not be retrievable",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.at(
        customerConnection,
        {
          shippingAddressId: address.id,
        },
      );
    },
  );
}
