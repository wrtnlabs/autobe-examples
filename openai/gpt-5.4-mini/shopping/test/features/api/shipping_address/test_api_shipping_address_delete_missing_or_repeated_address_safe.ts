import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_delete_missing_or_repeated_address_safe(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` as string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete missing shipping address is safely repeatable",
    async () => {
      await api.functional.mallPlatform.customer.shipping_addresses.erase(
        customerConnection,
        {
          shippingAddressId,
        },
      );
      await api.functional.mallPlatform.customer.shipping_addresses.erase(
        customerConnection,
        {
          shippingAddressId,
        },
      );
    },
  );
}
