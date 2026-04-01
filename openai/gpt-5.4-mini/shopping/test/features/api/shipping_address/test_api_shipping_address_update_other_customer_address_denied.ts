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

export async function test_api_shipping_address_update_other_customer_address_denied(
  connection: api.IConnection,
): Promise<void> {
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMallPlatformCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  await TestValidator.error(
    "other customer cannot update shipping address",
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.update(
        firstCustomerConnection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            recipientName: RandomGenerator.name(),
            phoneNumber: RandomGenerator.mobile(),
            streetAddress: RandomGenerator.paragraph({ sentences: 3 }),
            city: RandomGenerator.name(1),
            stateProvince: RandomGenerator.name(1),
            postalCode: RandomGenerator.alphaNumeric(8),
            country: RandomGenerator.name(1),
            isDefault: true,
          } satisfies IMallPlatformShippingAddress.IUpdate,
        },
      );
    },
  );
}
