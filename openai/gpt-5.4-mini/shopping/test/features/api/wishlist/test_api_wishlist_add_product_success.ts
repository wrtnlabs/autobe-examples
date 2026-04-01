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
import { generate_random_mall_platform_customer_wishlists_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_items_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_add_product_success(
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
  const productId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await api.functional.mallPlatform.customer.wishlists.items.create(
      customerConnection,
      {
        wishlistId,
        body: {
          mallPlatformProductId: productId,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "wishlist id should match path id",
    created.wishlist.id,
    wishlistId,
  );
  TestValidator.equals(
    "product id should match request body",
    created.product.id,
    productId,
  );
  TestValidator.equals(
    "wishlist owner should match authenticated customer",
    created.wishlist.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "wishlist item should be active",
    created.deletedAt,
    null,
  );
  TestValidator.predicate(
    "wishlist item id should exist",
    created.id.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be a non-empty timestamp",
    created.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be a non-empty timestamp",
    created.updatedAt.length > 0,
  );
}
