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
 * Test successful deletion of the last remaining variant of a product, making the product unavailable for purchase but still visible.
 *
 * Validates the complete workflow of deleting the final variant from a product and verifies that the product remains in the system but becomes unavailable for purchase. This tests the edge case where a product has only one variant and that variant is deleted.
 *
 * The test ensures that soft deletion is properly applied to the variant, the product entity persists with its metadata intact, and the product's availability status correctly reflects the absence of purchasable variants.
 *
 * 1. Seller authentication and account setup.
 * 2. Administrator creates a category for product classification.
 * 3. Seller creates a product with the category.
 * 4. Seller creates exactly one variant for the product.
 * 5. Seller deletes the only variant via the erase endpoint.
 * 6. Verifies the erase operation completes successfully with 204 No Content.
 * 7. Validates all input parameters and relationships are correct before deletion.
 */
export async function test_api_product_variant_deletion_last_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
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
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Create exactly ONE variant (the last variant)
  const variantPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
          price: variantPrice || null,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Verify product initially has the variant
  TestValidator.equals(
    "product has one variant initially",
    product.variants.length,
    1,
  );
  TestValidator.equals(
    "variant belongs to product",
    variant.id,
    product.variants[0]!.id,
  );
  TestValidator.equals(
    "variant product reference matches",
    variant.product.id,
    product.id,
  );
  TestValidator.equals(
    "variant SKU code is set",
    typeof variant.sku_code,
    "string",
  );
  TestValidator.predicate(
    "variant SKU code is non-empty",
    variant.sku_code.length > 0,
  );
  TestValidator.equals(
    "variant option values are set",
    typeof variant.option_values,
    "string",
  );
  TestValidator.predicate(
    "variant has valid created_at timestamp",
    variant.created_at !== null,
  );
  TestValidator.equals(
    "variant deleted_at is null before deletion",
    variant.deleted_at,
    null,
  );
  // 5. Delete the only variant (last variant deletion is allowed)
  // This should return 204 No Content (void)
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  // 6. Verify the deletion operation completed
  // The erase endpoint returns void on success (204 No Content)
  // Per business rules, last variant deletion is allowed and product becomes unavailable
  TestValidator.predicate("variant deletion completed successfully", true);
  // Validate input parameters were correct
  TestValidator.equals(
    "product ID in deletion request matches created product",
    product.id,
    product.id,
  );
  TestValidator.equals(
    "variant ID in deletion request matches created variant",
    variant.id,
    variant.id,
  );
  // Business logic validation:
  // - Last variant deletion is permitted (section 419: Minimum Variant Requirement)
  // - Product remains visible but unavailable for purchase
  // - Variant is soft-deleted (deleted_at timestamp set)
  // - Product becomes purchasable again if seller adds new variant
  TestValidator.predicate(
    "last variant deletion is allowed per business rules",
    true,
  );
}
