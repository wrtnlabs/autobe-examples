import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator retrieval of product variant details.
 *
 * Validates that an administrator can successfully retrieve detailed information for a specific product variant. The test ensures proper multi-actor workflow where a seller creates a product with variants and an administrator retrieves the variant information.
 *
 * The test verifies the complete variant record structure including SKU code, option values, optional price override, and audit timestamps. It also validates that the nested product summary contains seller and category information.
 *
 * 1. Administrator account is created and authenticated via join operation.
 * 2. Seller account is created and authenticated via join operation.
 * 3. Seller creates a product with name, description, category, and base price.
 * 4. Seller creates a variant on the product with SKU code and option values.
 * 5. Administrator retrieves the variant using productId and variantId.
 * 6. Validates all required fields are present and correctly populated.
 * 7. Confirms variant is active (deleted_at is null) and product reference matches.
 */
export async function test_api_product_variant_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - create and authenticate seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates a variant on the product
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green", "Black"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
          price: variantPrice,
        },
      },
    );
  typia.assert(variant);
  // 5. Administrator retrieves the variant
  const retrievedVariant =
    await api.functional.shoppingMall.admin.products.variants.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variant.id,
      },
    );
  typia.assert(retrievedVariant);
  // 6. Validate variant structure and data integrity
  TestValidator.equals("variant id matches", retrievedVariant.id, variant.id);
  TestValidator.equals(
    "sku code matches",
    retrievedVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "option values match",
    retrievedVariant.option_values,
    variant.option_values,
  );
  TestValidator.equals("price matches", retrievedVariant.price, variant.price);
  TestValidator.equals(
    "product id matches",
    retrievedVariant.product.id,
    product.id,
  );
  TestValidator.predicate(
    "variant is active",
    retrievedVariant.deleted_at === null,
  );
  // 7. Validate product summary structure
  TestValidator.equals(
    "product name matches",
    retrievedVariant.product.name,
    product.name,
  );
  TestValidator.equals(
    "product base_price matches",
    retrievedVariant.product.base_price,
    product.base_price,
  );
  TestValidator.predicate(
    "product category exists",
    retrievedVariant.product.category !== undefined,
  );
  TestValidator.predicate(
    "product seller exists",
    retrievedVariant.product.seller !== undefined,
  );
  TestValidator.equals(
    "seller id matches",
    retrievedVariant.product.seller.id,
    sellerAuth.id,
  );
}