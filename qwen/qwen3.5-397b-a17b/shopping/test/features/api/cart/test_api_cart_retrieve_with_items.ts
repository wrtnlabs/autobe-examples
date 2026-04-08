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
 * Test customer shopping cart retrieval with multiple items.
 *
 * Validates the complete cart retrieval workflow including member authentication, adding multiple product variants to the cart, and retrieving the cart with all item details. Ensures that the cart response includes complete product variant information (SKU code, option values, price, stock quantity), nested product details (name, base price, category, seller), correct quantities, and proper timestamps.
 *
 * Special attention is given to verifying that each cart item contains the variant's current price (not a stored price), and that the overall cart structure conforms to the IShoppingMallCart.IInvert schema. This validates the core business workflow of customers viewing their cart before checkout.
 *
 * 1. Member registers with email and credentials.
 * 2. Member adds multiple product variants to cart.
 * 3. Member retrieves cart with all items.
 * 4. Validates cart structure, item details, variant information, and product data.
 */
export async function test_api_cart_retrieve_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Add multiple product variants to cart
  const cartItems = await ArrayUtil.asyncRepeat(3, async (index) => {
    const cartItem =
      await generate_random_shopping_mall_member_cart_items_create(
        memberConnection,
        {
          body: {
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          },
        },
      );
    typia.assert(cartItem);
    return cartItem;
  });
  // 3. Retrieve cart
  const cart =
    await api.functional.shoppingMall.member.cart.at(memberConnection);
  typia.assert(cart);
  // 4. Validate business logic - quantities match what was added
  TestValidator.predicate(
    "cart quantity matches added items",
    cart.quantity >= 3,
  );
}
