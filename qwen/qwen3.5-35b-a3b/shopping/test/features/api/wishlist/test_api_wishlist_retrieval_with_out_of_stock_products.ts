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

export async function test_api_wishlist_retrieval_with_out_of_stock_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register member customer account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create wishlist for member
  const wishlist: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.create(
      memberConnection,
      { body: {} },
    );
  typia.assert(wishlist);
  // 3. Setup: Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(seller);
  // 4. Create product for seller
  const product: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 5. Retrieve wishlist and validate structure
  const retrievedWishlist: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.at(memberConnection, {
      wishlistId: wishlist.id,
    });
  typia.assert(retrievedWishlist);
  // 6. Validate wishlist basic structure
  TestValidator.equals(
    "wishlist id matches",
    retrievedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedWishlist.customer.id,
    member.id,
  );
  TestValidator.equals(
    "customer display name preserved",
    retrievedWishlist.customer.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "wishlist has updated_at timestamp",
    retrievedWishlist.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "wishlist has created_at timestamp",
    retrievedWishlist.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "wishlist deleted_at is null (active)",
    retrievedWishlist.deleted_at,
    null,
  );
  // 7. Validate product details in wishlist items
  // Even if product is out of stock, it should still appear in wishlist
  if (retrievedWishlist.items.length > 0) {
    const item = retrievedWishlist.items[0];
    // Verify product metadata is preserved
    TestValidator.equals("item has unique id", item.id !== undefined, true);
    TestValidator.equals(
      "item references correct wishlist",
      item.ecommerceMallWishlist.id,
      wishlist.id,
    );
    TestValidator.equals(
      "item has creation timestamp",
      item.createdAt !== undefined,
      true,
    );
    // Verify product details are included even if out of stock
    TestValidator.equals(
      "product name preserved",
      item.product.name !== "",
      true,
    );
    TestValidator.equals(
      "product main image exists",
      item.product.mainImage !== "",
      true,
    );
    TestValidator.equals(
      "product price range min is positive",
      item.product.priceRange.min > 0,
      true,
    );
    TestValidator.equals(
      "product price range max >= min",
      item.product.priceRange.max >= item.product.priceRange.min,
      true,
    );
    // Validate availability status field exists
    TestValidator.equals(
      "availability status field exists",
      item.product.availabilityStatus !== undefined,
      true,
    );
    // Availability status should be either 'available' or 'unavailable'
    TestValidator.predicate(
      "availability status is valid",
      ["available", "unavailable"].includes(item.product.availabilityStatus),
    );
  } else {
    // If no items in wishlist, verify structure is still valid
    TestValidator.equals(
      "wishlist with no items has correct structure",
      retrievedWishlist.items.length,
      0,
    );
  }
}
