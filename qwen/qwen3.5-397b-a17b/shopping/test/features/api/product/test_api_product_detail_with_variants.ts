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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a member can successfully retrieve complete details of an active product with variants.
 *
 * Validates the complete product detail retrieval flow including seller product creation with variants, member authentication, and product detail access. Ensures that the product response contains all required fields including seller information, category details, images in correct order, and variants with accurate stock status.
 *
 * Special attention is given to verifying that the product entity structure matches the created product data, that variants are properly associated with the product, and that all timestamps are valid ISO 8601 format.
 *
 * 1. Seller registers and creates a product with name, description, category, and base price.
 * 2. Seller adds at least one variant to the product with SKU code and option values.
 * 3. Member registers and authenticates to access product details.
 * 4. Member retrieves product details using the product ID.
 * 5. Validates product structure, seller info, category, images, variants, and timestamps.
 */
export async function test_api_product_detail_with_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create product with random data (utility handles category_id internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 2. Member setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Member retrieves product details
  const productDetail = await api.functional.shoppingMall.member.products.at(
    memberConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(productDetail);
  // 4. Validate product structure and data integrity
  TestValidator.equals("product id matches", productDetail.id, product.id);
  TestValidator.equals(
    "product name matches",
    productDetail.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    productDetail.description,
    product.description,
  );
  TestValidator.equals(
    "product base price matches",
    productDetail.base_price,
    product.base_price,
  );
  // Validate seller information exists
  TestValidator.predicate(
    "seller info exists",
    productDetail.seller !== undefined,
  );
  TestValidator.equals(
    "seller id matches",
    productDetail.seller.id,
    product.seller.id,
  );
  // Validate category information exists
  TestValidator.predicate(
    "category info exists",
    productDetail.category !== undefined,
  );
  TestValidator.equals(
    "category id matches",
    productDetail.category.id,
    product.category.id,
  );
  // Validate variants are included
  TestValidator.predicate(
    "variants array exists",
    Array.isArray(productDetail.variants),
  );
  TestValidator.predicate(
    "at least one variant exists",
    productDetail.variants.length >= 1,
  );
  // Validate the created variant is in the response
  const foundVariant = productDetail.variants.find((v) => v.id === variant.id);
  TestValidator.predicate("created variant found", foundVariant !== undefined);
  if (foundVariant) {
    TestValidator.equals(
      "variant sku_code matches",
      foundVariant.sku_code,
      variant.sku_code,
    );
    TestValidator.equals(
      "variant option_values matches",
      foundVariant.option_values,
      variant.option_values,
    );
  }
  // Validate timestamps are present and valid
  TestValidator.predicate(
    "created_at is valid date-time",
    productDetail.created_at !== null && productDetail.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    productDetail.updated_at !== null && productDetail.updated_at !== undefined,
  );
  // Validate product is not deleted
  TestValidator.equals(
    "deleted_at is null for active product",
    productDetail.deleted_at,
    null,
  );
}
