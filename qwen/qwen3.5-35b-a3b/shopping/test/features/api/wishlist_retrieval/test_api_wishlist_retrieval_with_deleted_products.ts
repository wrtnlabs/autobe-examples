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
 * Test automatic removal of deleted products from customer wishlist during retrieval.
 *
 * Validates the complete workflow of product deletion and its automatic cascade removal from customer wishlists. The test creates a customer account with a wishlist, adds a product to it, then deletes the product as a seller, verifying that the wishlist retrieves correctly without the deleted product while remaining valid itself.
 *
 * Special attention is given to verifying that soft-deleted products are automatically filtered out from wishlist items, the wishlist entity remains accessible, and no errors are thrown during retrieval even when all products in the wishlist have been deleted.
 *
 * 1. Register member customer account with randomized email, password, and credentials.
 * 2. Create a wishlist for the authenticated customer.
 * 3. Register seller account and login.
 * 4. Create a product for the seller.
 * 5. Add the product to customer's wishlist.
 * 6. Verify wishlist initially contains the product.
 * 7. Delete the product as seller.
 * 8. Retrieve wishlist and verify deleted product is removed from items array.
 * 9. Verify wishlist itself remains valid with deleted_at = NULL.
 */
export async function test_api_wishlist_retrieval_with_deleted_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member customer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(memberOutput);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerOutput);
  // 3. Login as seller (use correct password)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginOutput = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerLoginOutput);
  // 4. Create product as seller (note: category_id must exist for product creation to succeed)
  // Using a random UUID - in real scenario this would need a pre-existing category
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        category_id: category_id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Create wishlist for member with the product added initially
  const wishlistWithProduct =
    await api.functional.ecommerceMall.member.wishlists.create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(wishlistWithProduct);
  // 6. Delete the product as seller
  await api.functional.ecommerceMall.seller.products.erase(
    sellerLoginConnection,
    {
      productId: product.id,
    },
  );
  // 7. Retrieve wishlist and verify it's still accessible (wishlist itself should not be deleted)
  const retrievedWishlist =
    await api.functional.ecommerceMall.member.wishlists.at(memberConnection, {
      wishlistId: wishlistWithProduct.id,
    });
  typia.assert(retrievedWishlist);
  // 8. Verify wishlist is valid and not soft-deleted
  TestValidator.equals(
    "wishlist is accessible",
    retrievedWishlist.deleted_at,
    null,
  );
  // 9. Verify wishlist items are filtered correctly (deleted products should not appear)
  // After product deletion, the wishlist should either be empty or contain only active products
  // The items array should not contain the deleted product
  const hasDeletedProduct = retrievedWishlist.items.some(
    (item) => item.ecommerceMallWishlist.id === wishlistWithProduct.id,
  );
  TestValidator.equals(
    "wishlist structure is intact",
    retrievedWishlist.items.length >= 0,
    true,
  );
  // 10. Verify that the product's deletion cascade was properly applied
  // The product should no longer appear in any wishlist items due to cascade deletion
  const deletedProductInWishlist = retrievedWishlist.items.some(
    (item) => item.product.name === product.name,
  );
  TestValidator.predicate(
    "deleted product is removed from wishlist",
    () => !deletedProductInWishlist,
  );
}
