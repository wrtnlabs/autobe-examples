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

export async function test_api_wishlist_item_retrieve_outside_wishlist_scope(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const firstWishlistItem =
    await generate_random_mall_platform_customer_wishlists_create(
      customerConnection,
      {
        body: {
          mallPlatformProductId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(firstWishlistItem);
  const secondWishlistItem =
    await generate_random_mall_platform_customer_wishlists_create(
      customerConnection,
      {
        body: {
          mallPlatformProductId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(secondWishlistItem);
  TestValidator.notEquals(
    "two wishlist items should come from different wishlist records for scope mismatch",
    firstWishlistItem.wishlist.id,
    secondWishlistItem.wishlist.id,
  );
  await TestValidator.httpError(
    "wishlist item retrieval should fail when the item is outside the specified wishlist scope",
    404,
    async () => {
      await api.functional.mallPlatform.customer.wishlists.items.at(
        customerConnection,
        {
          wishlistId: firstWishlistItem.wishlist.id,
          wishlistItemId: secondWishlistItem.id,
        },
      );
    },
  );
}
