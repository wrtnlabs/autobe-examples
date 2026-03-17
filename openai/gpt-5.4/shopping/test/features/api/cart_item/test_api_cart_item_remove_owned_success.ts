import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_remove_owned_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  const found = await api.functional.shoppingMall.customer.cartItems.at(
    customerConnection,
    {
      cartItemId: cartItem.id,
    },
  );
  typia.assert(found);
  TestValidator.equals(
    "cart item id matches before deletion",
    found.id,
    cartItem.id,
  );
  TestValidator.equals(
    "cart item quantity matches before deletion",
    found.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "product id matches before deletion",
    found.product.id,
    cartItem.product.id,
  );
  TestValidator.equals(
    "product variant id matches before deletion",
    found.productVariant.id,
    cartItem.productVariant.id,
  );
  const erased = await api.functional.shoppingMall.customer.cartItems.erase(
    customerConnection,
    {
      cartItemId: cartItem.id,
    },
  );
  TestValidator.equals("delete returns no body", erased, undefined);
  await TestValidator.error(
    "deleted cart item is no longer retrievable",
    async () => {
      await api.functional.shoppingMall.customer.cartItems.at(
        customerConnection,
        {
          cartItemId: cartItem.id,
        },
      );
    },
  );
}
