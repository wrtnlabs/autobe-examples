import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function test_api_cart_item_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Add first product variant to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  TestValidator.predicate(
    "cart item should not be deleted initially",
    () => cartItem1.deleted_at === null,
  );
  // 3. Test removal using remove flag set to true
  const removedItem1 =
    await api.functional.shoppingMall.customer.cart.items.putByCartitemid(
      customerConnection,
      {
        cartItemId: cartItem1.id,
        body: {
          remove: true,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(removedItem1);
  TestValidator.predicate(
    "removed item should have deleted_at set",
    () => removedItem1.deleted_at !== null,
  );
  TestValidator.equals(
    "item ID should remain same",
    removedItem1.id,
    cartItem1.id,
  );
  // 4. Add second product variant to cart for quantity-based removal test
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  TestValidator.predicate(
    "second cart item should not be deleted initially",
    () => cartItem2.deleted_at === null,
  );
  // 5. Test removal using quantity set to 0
  const removedItem2 =
    await api.functional.shoppingMall.customer.cart.items.putByCartitemid(
      customerConnection,
      {
        cartItemId: cartItem2.id,
        body: {
          quantity: 0,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(removedItem2);
  TestValidator.predicate(
    "item removed with quantity 0 should have deleted_at set",
    () => removedItem2.deleted_at !== null,
  );
  TestValidator.equals(
    "item ID should remain same",
    removedItem2.id,
    cartItem2.id,
  );
  // 6. Verify both removal methods achieve the same soft delete result
  TestValidator.notEquals(
    "both items should have different IDs",
    removedItem1.id,
    removedItem2.id,
  );
  TestValidator.predicate(
    "both items should be soft deleted",
    () => removedItem1.deleted_at !== null && removedItem2.deleted_at !== null,
  );
}
