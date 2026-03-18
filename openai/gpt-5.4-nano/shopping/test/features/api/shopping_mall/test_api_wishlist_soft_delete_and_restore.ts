import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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
import { prepare_random_shopping_mall_wishlist } from "../../../prepare/prepare_random_shopping_mall_wishlist";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

export async function test_api_wishlist_soft_delete_and_restore(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);
  // Use the same authenticated connection for wishlist operations.
  const wishlistCreated =
    await generate_random_shopping_mall_member_wishlists_create(
      memberConnection,
      {},
    );
  typia.assert(wishlistCreated);
  TestValidator.equals(
    "wishlist initially active",
    wishlistCreated.deletedAt,
    null,
  );
  const deleteAt = RandomGenerator.date(new Date(), 1000 * 60).toISOString();
  const deleteAtTyped = deleteAt satisfies string & tags.Format<"date-time">;
  const deletedWishlist =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId: wishlistCreated.id,
        body: { deleted_at: deleteAtTyped },
      },
    );
  typia.assert(deletedWishlist);
  TestValidator.equals(
    "wishlist id stable",
    deletedWishlist.id,
    wishlistCreated.id,
  );
  TestValidator.equals(
    "wishlist ownership stable",
    deletedWishlist.shoppingMallMemberId,
    wishlistCreated.shoppingMallMemberId,
  );
  TestValidator.notEquals(
    "updatedAt changes on soft-delete",
    deletedWishlist.updatedAt,
    wishlistCreated.updatedAt,
  );
  TestValidator.equals(
    "deletedAt set",
    deletedWishlist.deletedAt,
    deleteAtTyped,
  );
  const updatedAtAfterDelete = deletedWishlist.updatedAt;
  const restoredWishlist =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId: wishlistCreated.id,
        body: { deleted_at: null },
      },
    );
  typia.assert(restoredWishlist);
  TestValidator.equals(
    "wishlist id stable after restore",
    restoredWishlist.id,
    wishlistCreated.id,
  );
  TestValidator.equals(
    "wishlist ownership stable after restore",
    restoredWishlist.shoppingMallMemberId,
    wishlistCreated.shoppingMallMemberId,
  );
  TestValidator.equals(
    "deletedAt restored to null",
    restoredWishlist.deletedAt,
    null,
  );
  TestValidator.notEquals(
    "updatedAt changes on restore",
    restoredWishlist.updatedAt,
    updatedAtAfterDelete,
  );
  const finalWishlist =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId: restoredWishlist.id,
        body: { deleted_at: null },
      },
    );
  typia.assert(finalWishlist);
  TestValidator.equals("final deletedAt null", finalWishlist.deletedAt, null);
  TestValidator.equals("final id stable", finalWishlist.id, wishlistCreated.id);
  TestValidator.equals(
    "final ownership stable",
    finalWishlist.shoppingMallMemberId,
    wishlistCreated.shoppingMallMemberId,
  );
}
