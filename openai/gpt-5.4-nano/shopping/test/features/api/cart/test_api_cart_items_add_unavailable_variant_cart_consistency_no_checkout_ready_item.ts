import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_carts_create } from "../../../generate/generate_random_shopping_mall_member_carts_create";
import { generate_random_shopping_mall_member_carts_items_create } from "../../../generate/generate_random_shopping_mall_member_carts_items_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_items_add_unavailable_variant_cart_consistency_no_checkout_ready_item(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register authenticated member and obtain actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a cart for the authenticated member
  const cart = await generate_random_shopping_mall_member_carts_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  // 3) Attempt to add an unavailable product variant
  // No admin/seller setup APIs are available in the provided prompt, so we
  // use a random variant id that should be processed as unavailable/ineligible.
  const unavailableVariantId = typia.random<string & tags.Format<"uuid">>();
  const requestBody = {
    shoppingMallProductVariantId: unavailableVariantId,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallCartItem.ICreate;
  let createdItem: IShoppingMallCartItem | undefined;
  await TestValidator.error(
    "adding unavailable cart variant must not create a purchasable cart item",
    async () => {
      createdItem =
        await generate_random_shopping_mall_member_carts_items_create(
          memberConnection,
          {
            params: {
              cartId: cart.id,
            },
            body: requestBody,
          },
        );
      typia.assert(createdItem);
    },
  );
  TestValidator.predicate(
    "no cart item should be returned on unavailable variant",
    () => createdItem === undefined,
  );
}
