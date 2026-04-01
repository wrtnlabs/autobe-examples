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
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_customer_wishlist_replace_saved_products(
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
  const wishlistId = typia.random<string & tags.Format<"uuid">>();
  const desiredProductIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const response = await api.functional.mallPlatform.customer.wishlists.update(
    customerConnection,
    {
      wishlistId,
      body: {
        wishlistItems: desiredProductIds.map((mallPlatformProductId) => ({
          mallPlatformProductId,
        })) satisfies IMallPlatformWishlistItem.ICreate[],
      } satisfies IMallPlatformWishlist.IUpdate,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "wishlist belongs to the authenticated customer",
    response.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "wishlist customer email matches the authenticated customer",
    response.customer.email,
    authorized.email,
  );
  TestValidator.equals(
    "updated wishlist contains the requested number of saved products",
    response.wishlistItems.length,
    desiredProductIds.length,
  );
  TestValidator.equals(
    "updated wishlist saved products match the requested product ids",
    response.wishlistItems.map((item) => item.product.id).sort(),
    desiredProductIds.sort(),
  );
  TestValidator.equals(
    "each saved product appears only once",
    new Set(response.wishlistItems.map((item) => item.product.id)).size,
    response.wishlistItems.length,
  );
  TestValidator.equals("wishlist remains active", response.deleted_at, null);
  TestValidator.predicate(
    "created timestamp is returned",
    response.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is returned",
    response.updated_at.length > 0,
  );
  TestValidator.predicate(
    "timestamps are in chronological order or equal",
    new Date(response.updated_at).getTime() >=
      new Date(response.created_at).getTime(),
  );
}
