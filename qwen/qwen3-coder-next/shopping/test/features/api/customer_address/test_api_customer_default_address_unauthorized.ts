import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_default_address_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create two customer connections
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await api.functional.shoppingMall.auth.customer.join(
    customerAConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.Format<"email"> &
            tags.MinLength<1> &
            tags.MaxLength<255>
        >() as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">,
        password: "1234",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await api.functional.shoppingMall.auth.customer.join(
    customerBConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.Format<"email"> &
            tags.MinLength<1> &
            tags.MaxLength<255>
        >() as string &
          tags.MinLength<1> &
          tags.MaxLength<255> &
          tags.Format<"email">,
        password: "1234",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerB);
  // Use a random address ID that does not belong to Customer A
  const randomAddressId = typia.random<string & tags.Format<"uuid">>();
  // Customer A attempts to set a random address as default (unauthorized since address doesn't exist)
  await TestValidator.error(
    "unauthorized address modification - address not found",
    async () => {
      await api.functional.shoppingMall.customer.addresses._default.setDefault(
        customerAConnection,
        {
          addressId: randomAddressId,
        },
      );
    },
  );
}
