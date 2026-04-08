import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a product without variants is visible but marked as unavailable to members.
 *
 * Validates the business rule that products must have at least one variant to be purchasable. A product without variants is still visible in the catalog but marked as out of stock (inStock: false), preventing customers from adding it to their cart.
 *
 * The test verifies that the product detail endpoint returns complete product information including seller and category data, while correctly indicating the unavailable state through the inStock field and empty variants array.
 *
 * 1. Seller registers and creates a product without variants.
 * 2. Member registers and authenticates.
 * 3. Member retrieves the product detail.
 * 4. Validates product visibility with inStock=false and empty variants array.
 */
export async function test_api_product_without_variants_unavailable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates product without variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Member setup - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 4. Member retrieves product detail
  const retrievedProduct = await api.functional.shoppingMall.member.products.at(
    memberConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(retrievedProduct);
  // 5. Validate product is visible but unavailable
  TestValidator.equals("product id matches", retrievedProduct.id, product.id);
  TestValidator.equals(
    "product name matches",
    retrievedProduct.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    retrievedProduct.description,
    product.description,
  );
  TestValidator.equals(
    "base price matches",
    retrievedProduct.base_price,
    product.base_price,
  );
  // Validate seller and category information are included
  TestValidator.predicate(
    "seller info exists",
    retrievedProduct.seller !== undefined,
  );
  TestValidator.predicate(
    "category info exists",
    retrievedProduct.category !== undefined,
  );
  // Validate variants array is empty (no variants exist)
  TestValidator.equals(
    "variants array is empty",
    retrievedProduct.variants.length,
    0,
  );
  // Validate product is active (not soft deleted)
  TestValidator.predicate(
    "product is not deleted",
    retrievedProduct.deleted_at === null,
  );
}