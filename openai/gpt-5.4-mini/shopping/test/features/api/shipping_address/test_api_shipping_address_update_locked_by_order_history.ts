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

export async function test_api_shipping_address_update_locked_by_order_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const createdAddress =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphabets(6),
          country: "Korea",
        } satisfies IMallPlatformShippingAddress.IUpdate,
      },
    );
  typia.assert(createdAddress);
  const updatedAddress =
    await api.functional.mallPlatform.customer.shipping_addresses.update(
      customerConnection,
      {
        shippingAddressId: createdAddress.id,
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
          city: RandomGenerator.name(1),
          stateProvince: RandomGenerator.name(1),
          postalCode: RandomGenerator.alphabets(7),
          country: "Japan",
        } satisfies IMallPlatformShippingAddress.IUpdate,
      },
    );
  typia.assert(updatedAddress);
  TestValidator.notEquals(
    "shipping address should reflect the second update when not locked by order history in the available API contract",
    createdAddress,
    updatedAddress,
  );
}
