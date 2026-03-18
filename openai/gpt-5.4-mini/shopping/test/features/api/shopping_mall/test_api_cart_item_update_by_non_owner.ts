import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_items_create } from "../../../generate/generate_random_shopping_mall_customer_items_create";
import { prepare_random_shopping_mall_order_item } from "../../../prepare/prepare_random_shopping_mall_order_item";

export async function test_api_cart_item_update_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuthorized = await authorize_customer_join(
    customerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: "https://example.com/join",
        referrer: "https://example.com/",
        ip: "127.0.0.1",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerAAuthorized);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuthorized = await authorize_customer_join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: "https://example.com/join",
        referrer: "https://example.com/",
        ip: "127.0.0.1",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerBAuthorized);
  const cartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "non-owner cannot update another customer's cart item",
    async () => {
      await api.functional.shoppingMall.customer.items.update(
        customerBConnection,
        {
          cartItemId,
          body: { quantity: 2 } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
  const anotherCartItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "customer can only update items they own",
    async () => {
      await api.functional.shoppingMall.customer.items.update(
        customerAConnection,
        {
          cartItemId: anotherCartItemId,
          body: { quantity: 3 } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
}
