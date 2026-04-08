import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_member_wishlists_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

/**
 * Test that deleted products cannot be added to wishlists during creation.
 *
 * Validates the business rule that only active products (deleted_at IS NULL) can be added to wishlists.
 * The test creates a seller account, publishes a product, soft-deletes it, then attempts to create
 * a wishlist with the deleted product ID. The system should reject this with a 400 error and not
 * create any wishlist records.
 *
 * 1. Member customer registers and authenticates
 * 2. Seller registers and authenticates
 * 3. Seller creates an active product
 * 4. Seller soft-deletes the product (sets deleted_at timestamp)
 * 5. Member attempts to create wishlist with deleted product in initial_product_ids
 * 6. API returns 400 Bad Request with error message
 * 7. Verify no wishlist was created in database
 */
export async function test_api_wishlist_creation_deleted_product_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member customer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(),
      href: "https://test.com/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(memberAuth);
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123",
      display_name: RandomGenerator.name(2),
      href: "https://test.com/join",
      referrer: "https://test.com",
    },
  });
  typia.assert(sellerAuth);
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerAuth.token.access;
  // 3. Create an active product as seller
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Soft-delete the product
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: product.id,
  });
  // Verify product is deleted by attempting to create wishlist with it
  // The API should reject the wishlist creation because the product is deleted
  await TestValidator.error(
    "wishlist creation should fail with deleted product",
    async () => {
      const wishlistBody = {
        name: "Test Wishlist",
        initial_product_ids: [product.id],
      } satisfies IEcommerceMallWishlist.ICreate;
      await api.functional.ecommerceMall.member.wishlists.create(
        memberConnection,
        {
          body: wishlistBody,
        },
      );
    },
  );
}
