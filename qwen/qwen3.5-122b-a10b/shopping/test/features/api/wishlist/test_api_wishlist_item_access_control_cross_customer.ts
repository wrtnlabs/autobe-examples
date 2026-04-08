import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlist";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
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
import { generate_random_ecommerce_customer_wishlists_items_create } from "../../../generate/generate_random_ecommerce_customer_wishlists_items_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_wishlist_item } from "../../../prepare/prepare_random_ecommerce_wishlist_item";

/**
 * Test cross-customer wishlist item access control validation.
 *
 * Validates that customers cannot access wishlist items belonging to other customers. The system enforces strict data isolation at the wishlist level, ensuring each customer can only access their own wishlist items.
 *
 * This test verifies the access control boundaries by simulating a scenario where Customer B attempts to retrieve a wishlist item that belongs to Customer A. The system should reject this unauthorized access attempt with a 404 Not Found response, preventing customers from discovering or accessing other customers' saved products.
 *
 * 1. Customer A registers and authenticates via join operation
 * 2. Customer B registers and authenticates via join operation (different customer)
 * 3. Seller registers and authenticates via join operation
 * 4. Seller creates a product that can be added to wishlists
 * 5. Customer A adds the product to their wishlist, creating wishlist item A
 * 6. Customer B attempts to retrieve wishlist item A using Customer A's wishlistId and itemId
 * 7. The system rejects the request with 404 Not Found because the wishlist does not belong to Customer B
 * 8. Validates that Customer B cannot discover or access any wishlist items owned by Customer A
 */
export async function test_api_wishlist_item_access_control_cross_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer A authenticates
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Customer B authenticates (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerB);
  // 3. Seller authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Seller creates a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Customer A adds the product to their wishlist
  const wishlistItem =
    await generate_random_ecommerce_customer_wishlists_items_create(
      customerAConnection,
      {
        body: {
          ecommerce_product_id: product.id,
        } satisfies IEcommerceWishlistItem.ICreate,
        params: {
          wishlistId: customerA.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 6. Customer B attempts to retrieve wishlist item A using Customer A's wishlistId and itemId
  // This should fail with 404 Not Found because the wishlist does not belong to Customer B
  await TestValidator.httpError(
    "Customer B cannot access Customer A's wishlist item",
    404,
    async () => {
      await api.functional.ecommerce.customer.wishlists.items.at(
        customerBConnection,
        {
          wishlistId: customerA.id,
          itemId: wishlistItem.id,
        },
      );
    },
  );
}
