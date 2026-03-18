import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_default_ownership_and_deleted_address(
  connection: api.IConnection,
): Promise<void> {
  const customer1Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const customer2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customer2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.httpError(
    "should reject setting an address that is not owned by the customer as default",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.customer.shipping_addresses._default.updateDefault(
        customer1Connection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "should reject setting a deleted address as default when the address cannot be resolved",
    [400, 401, 403, 404],
    async () => {
      await api.functional.shoppingMall.customer.shipping_addresses._default.updateDefault(
        customer1Connection,
        {
          shippingAddressId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
