import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_removal_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const registerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(registerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create authenticated connection using returned token
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: customer.token.access,
  };
  // 3. Try to remove non-existent wishlist item (should return 404)
  await TestValidator.error(
    "remove non-existent wishlist item should fail with 404",
    async () => {
      await api.functional.shoppingMall.customer.wishlist.erase(
        customerConnection,
        {
          productId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}