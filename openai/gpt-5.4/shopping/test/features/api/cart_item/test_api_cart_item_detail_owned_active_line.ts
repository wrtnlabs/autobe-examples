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

export async function test_api_cart_item_detail_owned_active_line(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const created =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: 3 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
        },
      },
    );
  typia.assert(created);
  const detail = await api.functional.shoppingMall.customer.cartItems.at(
    customerConnection,
    {
      cartItemId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals(
    "cart item id matches created line",
    detail.id,
    created.id,
  );
  TestValidator.equals(
    "product summary matches created line",
    detail.product.id,
    created.product.id,
  );
  TestValidator.equals(
    "product variant summary matches created line",
    detail.productVariant.id,
    created.productVariant.id,
  );
  TestValidator.equals(
    "quantity matches stored cart line",
    detail.quantity,
    created.quantity,
  );
  TestValidator.equals(
    "unit price preserves stored cart-time pricing",
    detail.unit_price,
    created.unit_price,
  );
  TestValidator.equals(
    "availability matches stored cart line state",
    detail.availability,
    created.availability,
  );
  TestValidator.equals(
    "created timestamp matches created line",
    detail.created_at,
    created.created_at,
  );
  TestValidator.equals(
    "updated timestamp matches created line",
    detail.updated_at,
    created.updated_at,
  );
  TestValidator.equals(
    "deleted timestamp remains active",
    detail.deleted_at,
    created.deleted_at,
  );
  TestValidator.equals(
    "subtotal equals stored unit price multiplied by quantity",
    detail.subtotal,
    detail.unit_price * detail.quantity,
  );
  TestValidator.equals(
    "active cart line is not deleted",
    detail.deleted_at,
    null,
  );
}
