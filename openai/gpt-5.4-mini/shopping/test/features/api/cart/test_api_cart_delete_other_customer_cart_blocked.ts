import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_delete_other_customer_cart_blocked(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerACart =
    await api.functional.mallPlatform.customer.carts.create(
      customerAConnection,
    );
  typia.assert(customerACart);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerB);
  const customerBCart =
    await api.functional.mallPlatform.customer.carts.create(
      customerBConnection,
    );
  typia.assert(customerBCart);
  await TestValidator.httpError(
    "deleting another customer's cart should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.carts.erase(
        customerAConnection,
        {
          cartId: customerBCart.id,
        },
      );
    },
  );
  const customerACartAfter =
    await api.functional.mallPlatform.customer.carts.create(
      customerAConnection,
    );
  typia.assert(customerACartAfter);
  const customerBCartAfter =
    await api.functional.mallPlatform.customer.carts.create(
      customerBConnection,
    );
  typia.assert(customerBCartAfter);
}
