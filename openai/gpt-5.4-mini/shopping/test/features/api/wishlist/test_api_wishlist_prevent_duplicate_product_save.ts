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

export async function test_api_wishlist_prevent_duplicate_product_save(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const wishlistId: string = typia.random<string & tags.Format<"uuid">>();
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const firstItem =
    await generate_random_mall_platform_customer_wishlists_items_create(
      customerConnection,
      {
        params: { wishlistId },
        body: {
          mallPlatformProductId: productId,
        } satisfies IMallPlatformWishlistItem.ICreate,
      },
    );
  typia.assert(firstItem);
  TestValidator.equals(
    "saved product should match the requested product",
    firstItem.product.id,
    productId,
  );
  await TestValidator.error(
    "duplicate product save should be rejected",
    async () => {
      await generate_random_mall_platform_customer_wishlists_items_create(
        customerConnection,
        {
          params: { wishlistId },
          body: {
            mallPlatformProductId: productId,
          } satisfies IMallPlatformWishlistItem.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "wishlist id should remain attached to the created item",
    firstItem.wishlist.id,
    wishlistId,
  );
}
