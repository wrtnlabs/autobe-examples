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

export async function test_api_wishlist_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register member customer
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Setup - Create wishlist for member
  const wishlist = await api.functional.ecommerceMall.member.wishlists.create(
    memberConnection,
    {
      body: {} satisfies IEcommerceMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);
  // 3. Setup - Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 4. Setup - Create product for seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Test - Retrieve wishlist (may have no items since item-addition endpoint is not available)
  const retrievedWishlist =
    await api.functional.ecommerceMall.member.wishlists.at(memberConnection, {
      wishlistId: wishlist.id,
    });
  typia.assert(retrievedWishlist);
  // 6. Validate wishlist structure
  TestValidator.equals(
    "wishlist id matches",
    retrievedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist created_at matches",
    retrievedWishlist.created_at,
    wishlist.created_at,
  );
  TestValidator.equals(
    "wishlist updated_at matches",
    retrievedWishlist.updated_at,
    wishlist.updated_at,
  );
  TestValidator.equals(
    "deleted_at is NULL",
    retrievedWishlist.deleted_at,
    null,
  );
  // 7. Validate customer reference
  TestValidator.equals(
    "customer id matches",
    retrievedWishlist.customer.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "customer display_name matches",
    retrievedWishlist.customer.display_name,
    memberAuth.display_name,
  );
  // 8. Validate items array structure
  typia.assert(retrievedWishlist.items);
  // 9. If items exist, validate each item
  if (retrievedWishlist.items.length > 0) {
    for (const item of retrievedWishlist.items) {
      typia.assert(item);
      // Validate item has required fields
      TestValidator.predicate("item has valid id", item.id.length === 36);
      TestValidator.predicate(
        "item has creation date",
        new Date(item.createdAt).getTime() > 0,
      );
      typia.assert(item.ecommerceMallWishlist);
      typia.assert(item.product);
      // Validate product fields
      TestValidator.predicate("product has name", item.product.name.length > 0);
      TestValidator.predicate(
        "product has main image URL",
        item.product.mainImage.length > 0,
      );
      TestValidator.predicate(
        "product has price range",
        item.product.priceRange.min > 0,
      );
      TestValidator.predicate(
        "product has price range max",
        item.product.priceRange.max > 0,
      );
      // Validate availability status
      TestValidator.equals(
        "product availability status is available",
        item.product.availabilityStatus,
        "available",
      );
    }
    // 10. Validate items are sorted by creation date (oldest first)
    for (let i = 1; i < retrievedWishlist.items.length; i++) {
      TestValidator.predicate(
        "items sorted by creation date",
        new Date(retrievedWishlist.items[i - 1].createdAt).getTime() <=
          new Date(retrievedWishlist.items[i].createdAt).getTime(),
      );
    }
  }
  // 11. Validate wishlist summary structure (ISummary fields)
  TestValidator.equals(
    "wishlist ISummary id",
    retrievedWishlist.id,
    wishlist.id,
  );
  TestValidator.equals(
    "wishlist ISummary deleted_at",
    retrievedWishlist.deleted_at,
    null,
  );
  TestValidator.equals(
    "wishlist ISummary customer id",
    retrievedWishlist.customer.id,
    memberAuth.id,
  );
}
