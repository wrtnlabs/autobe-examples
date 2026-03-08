import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that a seller cannot update a product name to duplicate another of their products.
 *
 * This test validates the unique constraint on (seller_id + name) for products.
 * When a seller attempts to rename a product to match another of their products,
 * the update should be rejected with a conflict error.
 *
 * Flow:
 * 1. Create administrator and authenticate
 * 2. Create seller and authenticate
 * 3. Create category (as administrator)
 * 4. Create first product "Product A" (as seller)
 * 5. Create second product "Product B" (as seller)
 * 6. Attempt to rename second product to "Product A" - should fail with 409 Conflict
 * 7. Verify second product still has name "Product B"
 * 8. Verify self-update (renaming to same name) succeeds
 */
export async function test_api_product_update_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create category as administrator
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  // Create first product with unique name "Product A"
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product A",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  // Create second product with different name "Product B"
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Product B",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<number & tags.Type<"uint32">>(),
      },
    },
  );
  // Test 1: Attempt to update second product's name to duplicate first product's name
  // This should fail with a conflict error (409)
  await TestValidator.error(
    "should reject update with duplicate product name within seller's products",
    async () => {
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: productB.id,
          body: {
            name: "Product A", // Duplicate of productA.name
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    },
  );
  // Test 2: Verify that updating product name to the same name succeeds
  // This validates that the duplicate check excludes the product itself
  const updatedProductB =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: productB.id,
      body: {
        name: "Product B", // Same as current name - should succeed
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProductB);
  TestValidator.equals(
    "product name unchanged after self-update",
    updatedProductB.name,
    "Product B",
  );
}
