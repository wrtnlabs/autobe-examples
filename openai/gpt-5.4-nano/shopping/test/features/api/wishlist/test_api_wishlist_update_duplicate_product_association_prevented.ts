import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_products_create_product } from "../../../generate/generate_random_shopping_mall_member_products_create_product";
import { generate_random_shopping_mall_member_wishlists_create } from "../../../generate/generate_random_shopping_mall_member_wishlists_create";
import { generate_random_shopping_mall_member_wishlists_items_create_wishlist_item } from "../../../generate/generate_random_shopping_mall_member_wishlists_items_create_wishlist_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_update_duplicate_product_association_prevented(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: undefined,
  });
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {
      body: undefined,
    },
  );
  typia.assert(wishlist);
  const productA =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      { body: undefined },
    );
  typia.assert(productA);
  const productB =
    await generate_random_shopping_mall_member_products_create_product(
      memberConnection,
      { body: undefined },
    );
  typia.assert(productB);
  const wishlistItemA =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      {
        params: { wishlistId: wishlist.id },
        body: {
          shopping_mall_product_id: productA.id,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItemA);
  await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
    memberConnection,
    {
      params: { wishlistId: wishlist.id },
      body: {
        shopping_mall_product_id: productB.id,
      } satisfies IShoppingMallWishlistItem.ICreate,
    },
  );
  try {
    const updated =
      await api.functional.shoppingMall.member.wishlists.items.updateWishlistItem(
        memberConnection,
        {
          wishlistId: wishlist.id,
          wishlistItemId: wishlistItemA.id,
          body: {
            shoppingMallProductId: productB.id,
          } satisfies IShoppingMallWishlistItem.IUpdate,
        },
      );
    typia.assert(updated);
    TestValidator.equals(
      "wishlist item should still reference product A after duplicate update",
      updated.shoppingMallProductId,
      productA.id,
    );
  } catch (e) {
    const err = e as unknown;
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      typeof (err as { status?: unknown }).status === "number"
    ) {
      TestValidator.predicate("duplicate update rejected", true);
      return;
    }
    throw e;
  }
}
