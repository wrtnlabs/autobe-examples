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

export async function test_api_wishlist_update_does_not_modify_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2) Create a wishlist container
  const wishlist = await generate_random_shopping_mall_member_wishlists_create(
    memberConnection,
    {
      body: {
        items: undefined,
      },
    },
  );
  typia.assert(wishlist);
  const wishlistId = wishlist.id;
  const originalMemberId = wishlist.shoppingMallMemberId;
  // 3) Soft-delete container
  const deletedWishlist1 =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IShoppingMallWishlist.IUpdate,
      },
    );
  typia.assert(deletedWishlist1);
  TestValidator.equals(
    "wishlist id unchanged after soft-delete",
    deletedWishlist1.id,
    wishlistId,
  );
  TestValidator.equals(
    "wishlist owner unchanged after soft-delete",
    deletedWishlist1.shoppingMallMemberId,
    originalMemberId,
  );
  TestValidator.predicate(
    "deletedAt should be non-null after soft-delete",
    deletedWishlist1.deletedAt !== null,
  );
  // 5) Idempotency variant: soft-delete again when already deleted
  const deletedWishlist2 =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId,
        body: {
          deleted_at: new Date().toISOString(),
        } satisfies IShoppingMallWishlist.IUpdate,
      },
    );
  typia.assert(deletedWishlist2);
  TestValidator.equals(
    "wishlist id unchanged after idempotent soft-delete",
    deletedWishlist2.id,
    wishlistId,
  );
  TestValidator.equals(
    "wishlist owner unchanged after idempotent soft-delete",
    deletedWishlist2.shoppingMallMemberId,
    originalMemberId,
  );
  TestValidator.predicate(
    "deletedAt should remain non-null after idempotent soft-delete",
    deletedWishlist2.deletedAt !== null,
  );
  // 4) Restore container
  const restoredWishlist =
    await api.functional.shoppingMall.member.wishlists.updateWishlist(
      memberConnection,
      {
        wishlistId,
        body: {
          deleted_at: null,
        } satisfies IShoppingMallWishlist.IUpdate,
      },
    );
  typia.assert(restoredWishlist);
  TestValidator.equals(
    "wishlist id unchanged after restore",
    restoredWishlist.id,
    wishlistId,
  );
  TestValidator.equals(
    "wishlist owner unchanged after restore",
    restoredWishlist.shoppingMallMemberId,
    originalMemberId,
  );
  TestValidator.equals(
    "deletedAt should be null after restore",
    restoredWishlist.deletedAt,
    null,
  );
  // Item assertions are intentionally skipped because no wishlist-item listing endpoint is provided.
}
