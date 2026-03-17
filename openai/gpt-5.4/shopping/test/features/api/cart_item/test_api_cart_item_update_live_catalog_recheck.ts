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

export async function test_api_cart_item_update_live_catalog_recheck(
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
      {},
    );
  typia.assert(created);
  const updateBody = {
    quantity: created.quantity + 1,
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
    "product id is preserved",
    updated.product.id,
    created.product.id,
  );
  TestValidator.equals(
    "product variant id is preserved",
    updated.productVariant.id,
    created.productVariant.id,
  );
  TestValidator.equals(
    "quantity is updated",
    updated.quantity,
    updateBody.quantity,
  );
  TestValidator.equals(
    "subtotal is recomputed from unit price and quantity",
    updated.subtotal,
    updated.unit_price * updated.quantity,
  );
  TestValidator.predicate(
    "updated_at is not earlier than created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
  TestValidator.equals("cart item remains active", updated.deleted_at, null);
  TestValidator.notEquals(
    "subtotal changes after quantity update",
    updated.subtotal,
    created.subtotal,
  );
}
