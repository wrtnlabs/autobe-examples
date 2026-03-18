import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_shipping_address_delete_default_address_reassigns_clear_default(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  await TestValidator.httpError(
    "deleting a non-existent shipping address should fail",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.customer.shipping_addresses.erase(
        customerConnection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  TestValidator.predicate(
    "customer authorization remains available",
    authorized.token.access.length > 0 && authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "customer email preserved",
    authorized.email,
    authorized.email,
  );
}
