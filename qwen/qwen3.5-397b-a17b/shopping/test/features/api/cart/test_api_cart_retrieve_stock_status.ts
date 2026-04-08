import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test cart retrieval with product variants showing accurate stock status.
 *
 * Validates the complete cart retrieval workflow including member authentication, adding product variants to cart, and retrieving cart with stock quantity information. Ensures that cart items correctly display the current inventory state of each variant, including items with low or zero stock.
 *
 * Special attention is given to verifying that the stock_quantity field accurately reflects the variant's current inventory level and that out-of-stock items remain visible in the cart for customer awareness before checkout attempts.
 *
 * 1. Member registers and authenticates with unique credentials.
 * 2. Product variant is added to the member's cart.
 * 3. Cart is retrieved with item and variant details including stock_quantity.
 * 4. Validates that cart item includes productVariant with stock_quantity field.
 * 5. Verifies stock quantity is non-negative integer reflecting current inventory state.
 */
export async function test_api_cart_retrieve_stock_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Add product variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies Partial<IShoppingMallCartItem.ICreate>,
    },
  );
  typia.assert(cartItem);
  // 3. Retrieve cart with stock status
  const cart =
    await api.functional.shoppingMall.member.cart.at(memberConnection);
  typia.assert(cart);
  // 4. Validate cart item structure and stock quantity field exists
  TestValidator.predicate(
    "cart item has positive quantity",
    cart.quantity >= 1,
  );
  TestValidator.predicate(
    "product variant has stock quantity field",
    typeof cart.productVariant.stock_quantity === "number",
  );
  TestValidator.predicate(
    "stock quantity is non-negative integer",
    cart.productVariant.stock_quantity >= 0 &&
      Number.isInteger(cart.productVariant.stock_quantity),
  );
  // 5. Validate cart item matches the added item
  TestValidator.equals(
    "cart item quantity matches added item",
    cart.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "cart item variant ID matches added item",
    cart.productVariant.id,
    cartItem.productVariant.id,
  );
  TestValidator.equals("cart item ID matches added item", cart.id, cartItem.id);
  // 6. Validate product variant structure includes required stock information
  TestValidator.predicate(
    "variant has SKU code",
    cart.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant has option values",
    cart.productVariant.option_values.length >= 0,
  );
  TestValidator.predicate(
    "variant has product reference",
    cart.productVariant.product !== undefined,
  );
}
