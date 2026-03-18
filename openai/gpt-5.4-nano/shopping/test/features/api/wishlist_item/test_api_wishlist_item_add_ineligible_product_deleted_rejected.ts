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

export async function test_api_wishlist_item_add_ineligible_product_deleted_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Create wishlist
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(wishlist);
  // 3) Pick an ineligible/deleted product id.
  //    No product list/fixture API is provided, so we use a UUID and rely on server eligibility checks.
  const ineligibleProductId = typia.random<string & tags.Format<"uuid">>();
  // 4) Attempt to add ineligible product (must be rejected)
  await TestValidator.error(
    "reject adding deleted/ineligible product to wishlist",
    async () => {
      await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
        memberConnection,
        {
          params: { wishlistId: wishlist.id },
          body: {
            shopping_mall_product_id: ineligibleProductId,
          },
        },
      );
    },
  );
  // 5) Validate no active wishlist item exists / no duplicate created.
  //    Best-effort: retry same add; it must still be rejected.
  await TestValidator.error(
    "still reject and no item becomes active on retry",
    async () => {
      await generate_random_shopping_mall_member_wishlists_items_create_wishlist_item(
        memberConnection,
        {
          params: { wishlistId: wishlist.id },
          body: {
            shopping_mall_product_id: ineligibleProductId,
          },
        },
      );
    },
  );
}
