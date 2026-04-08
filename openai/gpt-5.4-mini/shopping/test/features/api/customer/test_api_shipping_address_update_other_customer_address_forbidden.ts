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

export async function test_api_shipping_address_update_other_customer_address_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.httpError(
    "customer cannot update another customer's shipping address",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.update(
        intruderConnection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            recipientName: RandomGenerator.name(),
            phoneNumber: RandomGenerator.mobile(),
            streetAddress: RandomGenerator.paragraph({ sentences: 2 }),
            city: RandomGenerator.name(1),
            stateProvince: RandomGenerator.name(1),
            postalCode: RandomGenerator.alphaNumeric(6),
            country: "Korea",
          } satisfies IMallPlatformShippingAddress.IUpdate,
        },
      );
    },
  );
}
