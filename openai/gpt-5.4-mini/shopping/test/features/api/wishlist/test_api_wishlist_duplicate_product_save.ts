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

export async function test_api_wishlist_duplicate_product_save(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) satisfies string,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const first = await generate_random_mall_platform_customer_wishlists_create(
    customerConnection,
    {
      body: {
        mallPlatformProductId: productId,
      } satisfies IMallPlatformWishlistItem.ICreate,
    },
  );
  typia.assert(first);
  const second = await generate_random_mall_platform_customer_wishlists_create(
    customerConnection,
    {
      body: {
        mallPlatformProductId: productId,
      } satisfies IMallPlatformWishlistItem.ICreate,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "saved product id should remain the same",
    second.product.id,
    first.product.id,
  );
  TestValidator.equals(
    "wishlist owner should remain the same",
    second.wishlist.customer.id,
    first.wishlist.customer.id,
  );
  TestValidator.equals(
    "wishlist owner email should remain the same",
    second.wishlist.customer.email,
    first.wishlist.customer.email,
  );
  TestValidator.equals(
    "customer context should remain the same",
    second.wishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email should remain the same",
    second.wishlist.customer.email,
    customer.email,
  );
  TestValidator.equals(
    "duplicate save should preserve product name",
    second.product.name,
    first.product.name,
  );
  TestValidator.equals(
    "duplicate save should preserve product description",
    second.product.description,
    first.product.description,
  );
  TestValidator.equals(
    "duplicate save should preserve product base price",
    second.product.basePrice,
    first.product.basePrice,
  );
  TestValidator.equals(
    "duplicate save should preserve seller account",
    second.product.sellerAccount.id,
    first.product.sellerAccount.id,
  );
  TestValidator.equals(
    "duplicate save should preserve category",
    second.product.category,
    first.product.category,
  );
}
