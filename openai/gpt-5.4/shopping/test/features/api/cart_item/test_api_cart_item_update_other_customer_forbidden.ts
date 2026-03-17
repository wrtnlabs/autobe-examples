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

export async function test_api_cart_item_update_other_customer_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IShoppingMallCustomer.IJoin>,
  });
  const originalCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      ownerConnection,
      {
        body: {
          quantity: 1,
        } satisfies DeepPartial<IShoppingMallCartItem.ICreate>,
      },
    );
  typia.assert(originalCartItem);
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IShoppingMallCustomer.IJoin>,
  });
  const forbiddenQuantity = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    (originalCartItem.quantity + 1) satisfies number as number,
  );
  const forbiddenBody = {
    quantity: forbiddenQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  await TestValidator.httpError(
    "other customer cannot update cart item",
    403,
    async () => {
      await api.functional.shoppingMall.customer.cartItems.update(
        intruderConnection,
        {
          cartItemId: originalCartItem.id,
          body: forbiddenBody,
        },
      );
    },
  );
  const preservedQuantity = typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
    originalCartItem.quantity satisfies number as number,
  );
  const ownerPreserved =
    await api.functional.shoppingMall.customer.cartItems.update(
      ownerConnection,
      {
        cartItemId: originalCartItem.id,
        body: {
          quantity: preservedQuantity,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(ownerPreserved);
  TestValidator.equals(
    "cart item id preserved",
    ownerPreserved.id,
    originalCartItem.id,
  );
  TestValidator.equals(
    "cart item quantity preserved",
    ownerPreserved.quantity,
    originalCartItem.quantity,
  );
  TestValidator.equals(
    "cart item product preserved",
    ownerPreserved.product.id,
    originalCartItem.product.id,
  );
  TestValidator.equals(
    "cart item variant preserved",
    ownerPreserved.productVariant.id,
    originalCartItem.productVariant.id,
  );
  TestValidator.equals(
    "cart item unit price preserved",
    ownerPreserved.unit_price,
    originalCartItem.unit_price,
  );
  TestValidator.equals(
    "cart item availability preserved",
    ownerPreserved.availability,
    originalCartItem.availability,
  );
  TestValidator.equals(
    "cart item subtotal preserved",
    ownerPreserved.subtotal,
    originalCartItem.subtotal,
  );
}
