import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_wishlists_create } from "../../../generate/generate_random_shopping_mall_customer_wishlists_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_customer_wishlist } from "../../../prepare/prepare_random_shopping_mall_customer_wishlist";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a customer cannot delete another customer's wishlist entry (authorization enforcement).
 *
 * Validates that the wishlist deletion endpoint properly enforces authorization by preventing customers from deleting wishlist entries that belong to other customers. This test ensures that the shopping_mall_customer_id in the wishlist entry matches the authenticated customer's ID before allowing deletion.
 *
 * Special attention is given to verifying that unauthorized deletion attempts are blocked with a 403 Forbidden response and that the original wishlist entry remains intact and accessible to its owner after the failed deletion attempt.
 *
 * 1. Seller registers and creates a product for testing.
 * 2. Customer A registers and adds the product to their wishlist.
 * 3. Customer B registers and attempts to delete customer A's wishlist entry.
 * 4. Verify that customer B receives a 403 Forbidden error.
 * 5. Verify that customer A's wishlist entry remains unchanged by attempting to add the same product again (should fail with 409 Conflict).
 */
export async function test_api_wishlist_remove_product_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 2. Customer A setup - register and add product to wishlist
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {});
  const wishlistEntry =
    await generate_random_shopping_mall_customer_wishlists_create(
      customerAConnection,
      { body: { productId: product.id } },
    );
  typia.assert(wishlistEntry);
  // 3. Customer B setup - register (will attempt unauthorized deletion)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 4. Customer B attempts to delete customer A's wishlist entry - should fail with 403
  await TestValidator.httpError(
    "unauthorized wishlist deletion returns 403",
    403,
    async () =>
      await api.functional.shoppingMall.customer.wishlists.erase(
        customerBConnection,
        { wishlistId: wishlistEntry.id },
      ),
  );
  // 5. Verify customer A's wishlist entry still exists by attempting to add the same product again
  // This should fail with 409 Conflict if the entry still exists (wasn't deleted)
  await TestValidator.httpError(
    "wishlist entry still exists for customer A",
    409,
    async () =>
      await api.functional.shoppingMall.customer.wishlists.create(
        customerAConnection,
        { body: { productId: product.id } },
      ),
  );
}
