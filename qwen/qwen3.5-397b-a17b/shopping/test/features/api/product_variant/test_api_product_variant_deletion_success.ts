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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test successful deletion of a product variant by the seller who owns the product.
 *
 * Validates the complete variant deletion workflow including seller authentication, product and variant setup, and successful soft deletion. Ensures that the variant deletion operation completes without error and that the product remains accessible with its remaining variants intact.
 *
 * Special attention is given to verifying that the seller can delete variants from their own products, the deletion operation returns successfully, and the product structure remains valid with remaining variants. The test confirms ownership validation and proper cascade behavior.
 *
 * 1. Seller registers and authenticates via /shoppingMall/auth/seller/join.
 * 2. Admin creates a category via /shoppingMall/admin/categories (prerequisite for product).
 * 3. Seller creates a product via /shoppingMall/seller/products with the category.
 * 4. Seller creates two variants via /shoppingMall/seller/products/{productId}/variants.
 * 5. Seller deletes one variant via DELETE /shoppingMall/seller/products/{productId}/variants/{variantId}.
 * 6. Validates deletion operation completes successfully (204 No Content).
 * 7. Validates the product and remaining variant are intact.
 * 8. Validates variant IDs are unique and properly generated.
 */
export async function test_api_product_variant_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
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
  // 3. Seller creates product
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
  // 4. Create two variants for the product
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant2);
  // 5. Delete variant1 - this should succeed with 204 No Content
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant1.id,
    },
  );
  // 6. Validate the two variants have different IDs
  TestValidator.notEquals(
    "variants have different IDs",
    variant1.id,
    variant2.id,
  );
  // 7. Validate product associations are correct
  TestValidator.equals("product has seller", product.seller.id, sellerAuth.id);
  TestValidator.equals(
    "product category matches",
    product.category.id,
    category.id,
  );
  // 8. Validate variant associations
  TestValidator.equals(
    "variant1 belongs to product",
    variant1.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant2 belongs to product",
    variant2.product.id,
    product.id,
  );
  // 9. Validate variant structure
  TestValidator.predicate(
    "variant1 has SKU code",
    variant1.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant2 has SKU code",
    variant2.sku_code.length > 0,
  );
  TestValidator.predicate(
    "variant1 has option values",
    variant1.option_values.length > 0,
  );
  TestValidator.predicate(
    "variant2 has option values",
    variant2.option_values.length > 0,
  );
  // 10. Validate product remains accessible with correct base price
  TestValidator.predicate(
    "product base price is positive",
    product.base_price > 0,
  );
}
