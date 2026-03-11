import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_authorization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Customer A account
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerAConnection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>(),
    });
  typia.assert(customerA);
  // 2. Create Customer B account
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerBConnection, {
      body: typia.random<IEcommerceMallCustomer.IJoin>(),
    });
  typia.assert(customerB);
  // 3. Customer A accesses their cart
  const customerACart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.at(customerAConnection, {
      cartId: customerA.id,
    });
  typia.assert(customerACart);
  // 4. Customer B attempts to access Customer A's cart (should fail)
  await TestValidator.error(
    "Customer B cannot access Customer A's cart",
    async () => {
      await api.functional.ecommerceMall.customer.carts.at(
        customerBConnection,
        {
          cartId: customerA.id,
        },
      );
    },
  );
  // 5. Customer A can still access their own cart successfully
  const customerACartVerified: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.at(customerAConnection, {
      cartId: customerA.id,
    });
  typia.assert(customerACartVerified);
  // 6. Customer B can access their own cart
  const customerBCart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.at(customerBConnection, {
      cartId: customerB.id,
    });
  typia.assert(customerBCart);
}
