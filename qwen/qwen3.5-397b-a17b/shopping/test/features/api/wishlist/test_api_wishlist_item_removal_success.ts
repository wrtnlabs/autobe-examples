import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_member_wishlist_items_create";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test customer wishlist item removal success path.
 *
 * Validates the complete wishlist item removal workflow including member authentication, wishlist item creation, and successful deletion. Ensures that customers can curate their wishlist by removing items they no longer wish to track.
 *
 * The test verifies that the erase operation completes successfully for the authenticated member's own wishlist item. The deletion is performed using the wishlist item ID obtained from the creation response.
 *
 * 1. Member registers new account with unique email credentials.
 * 2. Member adds a product to their wishlist using the wishlist item creation endpoint.
 * 3. Member removes the wishlist item using the erase endpoint with the wishlist item ID.
 * 4. Validates that the deletion operation completes without error.
 */
export async function test_api_wishlist_item_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. Add product to member's wishlist
  const wishlistItem: IShoppingMallWishlistItem =
    await generate_random_shopping_mall_member_wishlist_items_create(
      memberConnection,
      {},
    );
  typia.assert(wishlistItem);
  // 3. Remove the wishlist item
  await api.functional.shoppingMall.member.wishlist_items.erase(
    memberConnection,
    {
      wishlistItemId: wishlistItem.id,
    },
  );
}
