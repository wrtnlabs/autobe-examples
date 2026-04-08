import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_member_wishlist_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test successful wishlist item retrieval by member.
 *
 * Validates the complete wishlist item retrieval flow including administrative category setup, seller product creation, member registration, wishlist addition, and item retrieval. Ensures that the retrieved wishlist item contains complete product information with correct seller and category references.
 *
 * Special attention is given to verifying that the product information in the wishlist item matches the original product data, including name, base price, category, and seller details. The test confirms that wishlist items expose product-level summary information without variant-specific details.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller registers and creates a product under the category.
 * 3. Member registers and authenticates.
 * 4. Member adds the product to their wishlist.
 * 5. Member retrieves the wishlist item by ID.
 * 6. Validates wishlist item contains complete product information matching the original product.
 */
export async function test_api_wishlist_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" satisfies "regular" | "super",
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Member setup - register and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Add product to member's wishlist
  const wishlistItem =
    await generate_random_shopping_mall_member_wishlist_items_create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
        },
      },
    );
  typia.assert(wishlistItem);
  // 5. Retrieve wishlist item by ID
  const retrievedItem =
    await api.functional.shoppingMall.member.wishlist_items.at(
      memberConnection,
      {
        wishlistItemId: wishlistItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 6. Validate wishlist item contains correct product information
  TestValidator.equals("wishlist item ID", retrievedItem.id, wishlistItem.id);
  TestValidator.equals(
    "product ID matches",
    retrievedItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "product name matches",
    retrievedItem.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base price matches",
    retrievedItem.product.base_price,
    product.base_price,
  );
  TestValidator.equals(
    "category ID matches",
    retrievedItem.product.category.id,
    category.id,
  );
  TestValidator.equals(
    "category name matches",
    retrievedItem.product.category.name,
    category.name,
  );
  TestValidator.equals(
    "seller ID matches",
    retrievedItem.product.seller.id,
    product.seller.id,
  );
  TestValidator.equals(
    "seller email matches",
    retrievedItem.product.seller.email,
    product.seller.email,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    typeof retrievedItem.created_at === "string",
  );
}
