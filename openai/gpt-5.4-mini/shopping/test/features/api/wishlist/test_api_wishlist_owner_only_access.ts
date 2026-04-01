import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_wishlists_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_owner_only_access(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruder = await authorize_customer_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(intruder);
  const wishlistItem =
    await generate_random_mall_platform_customer_wishlists_create(
      ownerConnection,
      {
        body: {
          mallPlatformProductId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(wishlistItem);
  const wishlist = wishlistItem.wishlist;
  typia.assert(wishlist);
  await TestValidator.httpError(
    "cross-account wishlist retrieval should be denied",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.at(
        intruderConnection,
        {
          wishlistId: wishlist.id,
        },
      );
    },
  );
  const ownerWishlist = await api.functional.mallPlatform.customer.wishlists.at(
    ownerConnection,
    {
      wishlistId: wishlist.id,
    },
  );
  typia.assert(ownerWishlist);
  TestValidator.equals(
    "wishlist id remains unchanged",
    ownerWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist owner remains unchanged",
    ownerWishlist.customer.id,
    owner.id,
  );
}
