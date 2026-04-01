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
import { generate_random_mall_platform_customer_wishlists_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_items_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_item_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const savedItem =
    await generate_random_mall_platform_customer_wishlists_items_create(
      ownerConnection,
      {
        params: {
          wishlistId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: {
          mallPlatformProductId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(savedItem);
  const retrieved =
    await api.functional.mallPlatform.customer.wishlists.items.at(
      ownerConnection,
      {
        wishlistId: savedItem.wishlist.id,
        wishlistItemId: savedItem.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("wishlist item id", retrieved.id, savedItem.id);
  TestValidator.equals(
    "wishlist id",
    retrieved.wishlist.id,
    savedItem.wishlist.id,
  );
  TestValidator.equals(
    "product id",
    retrieved.product.id,
    savedItem.product.id,
  );
  TestValidator.equals(
    "wishlist owner id",
    retrieved.wishlist.customer.id,
    owner.id,
  );
  TestValidator.equals("active item deletedAt", retrieved.deletedAt, null);
  TestValidator.predicate("createdAt exists", retrieved.createdAt.length > 0);
  TestValidator.predicate("updatedAt exists", retrieved.updatedAt.length > 0);
  const otherConnection: api.IConnection = { host: connection.host };
  const other = await authorize_customer_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(other);
  await TestValidator.error("cross-customer access must fail", async () => {
    await api.functional.mallPlatform.customer.wishlists.items.at(
      otherConnection,
      {
        wishlistId: savedItem.wishlist.id,
        wishlistItemId: savedItem.id,
      },
    );
  });
}
