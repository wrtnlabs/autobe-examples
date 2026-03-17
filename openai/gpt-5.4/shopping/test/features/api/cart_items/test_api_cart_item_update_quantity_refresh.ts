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

export async function test_api_cart_item_update_quantity_refresh(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const created =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 1,
        },
      },
    );
  typia.assert(created);
  const updatedQuantity = 3 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const updateBody = {
    quantity: updatedQuantity,
  } satisfies IShoppingMallCartItem.IUpdate;
  const updated = await api.functional.shoppingMall.customer.cartItems.update(
    customerConnection,
    {
      cartItemId: created.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("cart item id is preserved", updated.id, created.id);
  TestValidator.equals(
    "cart item quantity is refreshed",
    updated.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "cart item created_at remains unchanged",
    updated.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "cart item product reference remains unchanged",
    updated.product.id,
    created.product.id,
  );
  TestValidator.equals(
    "cart item variant reference remains unchanged",
    updated.productVariant.id,
    created.productVariant.id,
  );
  TestValidator.notEquals(
    "cart item updated_at is refreshed",
    updated.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "cart item subtotal is recomputed from unit price and quantity",
    updated.subtotal,
    updated.unit_price * updated.quantity,
  );
}
