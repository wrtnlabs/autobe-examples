import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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
import { generate_random_mall_platform_customer_wishlists_wishlist_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_wishlist_items_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_deleted_product_save_preserves_existing_items(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const existingWishlistItem =
    await generate_random_mall_platform_customer_wishlists_wishlist_items_create(
      customerConnection,
      { body: undefined },
    );
  typia.assert(existingWishlistItem);
  const deletedProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleted product cannot be saved to wishlist",
    async () => {
      await api.functional.mallPlatform.customer.wishlists.wishlist_items.create(
        customerConnection,
        {
          body: {
            product_id: deletedProductId,
          } satisfies IMallPlatformWishlistItem.ICreate,
        },
      );
    },
  );
  const preservedWishlistItem =
    await generate_random_mall_platform_customer_wishlists_wishlist_items_create(
      customerConnection,
      {
        body: {
          product_id: existingWishlistItem.product.id,
        },
      },
    );
  typia.assert(preservedWishlistItem);
  TestValidator.equals(
    "existing wishlist item should remain intact after failed deleted-product save",
    preservedWishlistItem.product.id,
    existingWishlistItem.product.id,
  );
  TestValidator.notEquals(
    "failed deleted-product save should not replace the pre-existing saved item",
    preservedWishlistItem.id,
    existingWishlistItem.id,
  );
}
