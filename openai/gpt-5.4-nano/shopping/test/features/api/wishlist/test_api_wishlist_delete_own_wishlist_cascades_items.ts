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
import { generate_random_shopping_mall_member_wishlists_create } from "../../../generate/generate_random_shopping_mall_member_wishlists_create";
import { generate_random_shopping_mall_member_wishlists_items_create_wishlist_item } from "../../../generate/generate_random_shopping_mall_member_wishlists_items_create_wishlist_item";
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_delete_own_wishlist_cascades_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member identity
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create wishlist
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {},
  );
  typia.assert(wishlist);
  // 3) Add at least one wishlist item
  const wishlistItem =
    await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
      memberConnection,
      {
        params: { wishlistId: wishlist.id },
      },
    );
  typia.assert(wishlistItem);
  // 4) Delete wishlist
  await api.functional.shoppingMall.member.wishlists.eraseWishlist(
    memberConnection,
    { wishlistId: wishlist.id },
  );
  // 5) Validate cascade indirectly: cannot add new items to deleted wishlist
  await TestValidator.error(
    "wishlist items cannot be created after parent wishlist delete",
    async () => {
      await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
        memberConnection,
        {
          params: { wishlistId: wishlist.id },
        },
      );
    },
  );
}
