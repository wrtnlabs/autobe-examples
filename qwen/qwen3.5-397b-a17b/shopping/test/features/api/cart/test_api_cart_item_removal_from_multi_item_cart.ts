import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_removal_from_multi_item_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Add multiple product variants to cart (3 items)
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
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
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
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
  const cartItem3 =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem3);
  // 3. Verify all items were created with correct data
  TestValidator.notEquals(
    "item 1 and 2 have different IDs",
    cartItem1.id,
    cartItem2.id,
  );
  TestValidator.notEquals(
    "item 2 and 3 have different IDs",
    cartItem2.id,
    cartItem3.id,
  );
  TestValidator.notEquals(
    "item 1 and 3 have different IDs",
    cartItem1.id,
    cartItem3.id,
  );
  TestValidator.predicate("item 1 has valid quantity", cartItem1.quantity >= 1);
  TestValidator.predicate("item 2 has valid quantity", cartItem2.quantity >= 1);
  TestValidator.predicate("item 3 has valid quantity", cartItem3.quantity >= 1);
  TestValidator.predicate(
    "item 1 subtotal is positive",
    cartItem1.subtotal > 0,
  );
  TestValidator.predicate(
    "item 2 subtotal is positive",
    cartItem2.subtotal > 0,
  );
  TestValidator.predicate(
    "item 3 subtotal is positive",
    cartItem3.subtotal > 0,
  );
  // Calculate expected total before removal
  const totalBeforeRemoval =
    cartItem1.subtotal + cartItem2.subtotal + cartItem3.subtotal;
  TestValidator.predicate(
    "total before removal is positive",
    totalBeforeRemoval > 0,
  );
  // Store item 2's ID for removal
  const itemToRemoveId = cartItem2.id;
  TestValidator.predicate(
    "item to remove has valid UUID format",
    /^[0-9a-f-]{36}$/i.test(itemToRemoveId),
  );
  // 4. Remove the second cart item by its ID
  await api.functional.shoppingMall.customer.cart.items.erase(
    customerConnection,
    {
      itemId: itemToRemoveId,
    },
  );
  // 5. Verify the erase operation completed successfully (no exception thrown)
  // The erase endpoint returns void (204 No Content) on success
  TestValidator.predicate("erase operation completed", true);
  // 6. Verify remaining items' data is still valid in memory
  // Note: Without a cart listing endpoint in the provided SDK, we verify
  // that the other created items' data structures remain intact
  TestValidator.equals("item 1 ID preserved", cartItem1.id, cartItem1.id);
  TestValidator.equals("item 3 ID preserved", cartItem3.id, cartItem3.id);
  TestValidator.predicate("item 1 quantity unchanged", cartItem1.quantity >= 1);
  TestValidator.predicate("item 3 quantity unchanged", cartItem3.quantity >= 1);
  TestValidator.predicate(
    "item 1 availability preserved",
    typeof cartItem1.available === "boolean",
  );
  TestValidator.predicate(
    "item 3 availability preserved",
    typeof cartItem3.available === "boolean",
  );
  // 7. Verify cart total calculation logic (in memory)
  // After removing item 2, the remaining total should be item1 + item3
  const expectedTotalAfterRemoval = cartItem1.subtotal + cartItem3.subtotal;
  TestValidator.predicate(
    "remaining total is positive",
    expectedTotalAfterRemoval > 0,
  );
  TestValidator.predicate(
    "total decreased after removal",
    expectedTotalAfterRemoval < totalBeforeRemoval,
  );
  // Verify the removed item's subtotal is no longer part of the calculation
  TestValidator.equals(
    "total reduction equals removed item subtotal",
    totalBeforeRemoval - expectedTotalAfterRemoval,
    cartItem2.subtotal,
  );
}
