import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_customer_wishlist_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_wishlist_items_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist_item } from "../../../prepare/prepare_random_ecommerce_mall_wishlist_item";

export async function test_api_wishlist_removal_idempotent_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // ------------------------------------------------------------
  // Part 1: Delete a non-existent wishlist item (random UUID)
  // ------------------------------------------------------------
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.eCommerceMall.customer.wishlist_items.erase(
    customerConnection,
    { wishlistItemId: nonExistentId },
  );
  // ------------------------------------------------------------
  // Part 2: Create a product and add it to wishlist, then delete twice
  // ------------------------------------------------------------
  // Seller creates a product
  const product: IECommerceMallProduct =
    await generate_random_e_commerce_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // Customer adds product to wishlist
  const wishlistItem: IECommerceMallWishlistItem =
    await generate_random_e_commerce_mall_customer_wishlist_items_create(
      customerConnection,
      {
        body: { product_id: product.id },
      },
    );
  typia.assert(wishlistItem);
  // First delete — should succeed
  await api.functional.eCommerceMall.customer.wishlist_items.erase(
    customerConnection,
    { wishlistItemId: wishlistItem.id },
  );
  // Second delete — should be idempotent, must not throw
  await api.functional.eCommerceMall.customer.wishlist_items.erase(
    customerConnection,
    { wishlistItemId: wishlistItem.id },
  );
}
