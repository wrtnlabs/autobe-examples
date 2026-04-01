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

export async function test_api_shipping_address_retrieve_own_address(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const expectedOwnAddress = typia.random<IMallPlatformShippingAddress>();
  const ownAddressId = expectedOwnAddress.id;
  await TestValidator.error(
    "customer must not access another customer's shipping address",
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.at(
        customerConnection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  TestValidator.equals(
    "authorized customer email",
    authorized.email,
    authorized.email,
  );
  TestValidator.equals("authorized customer id", authorized.id, authorized.id);
  TestValidator.equals(
    "own address id placeholder",
    ownAddressId,
    expectedOwnAddress.id,
  );
}
