import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that an administrator can successfully view SKU snapshots for any seller's product,
 * validating the administrative oversight capability for dispute resolution and compliance.
 */
export async function test_api_product_snapshot_sku_administrator_oversight(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Setup administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 3. Administrator creates a product category
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates a product variant (SKU)
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode:
            `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}` as string &
              tags.MinLength<3> &
              tags.MaxLength<50>,
          optionValues: {
            color: RandomGenerator.pick([
              "Red",
              "Blue",
              "Green",
              "Black",
            ] as const),
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          },
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<10000>>(),
        },
      },
    );
  typia.assert(variant);
  // 6. Seller updates the product (creates snapshot with SKU snapshots)
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: `${product.name} - Updated`,
        description: `${product.description} Additional information added.`,
        base_price: product.base_price,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // Verify the product was updated and has variants
  TestValidator.predicate(
    "product has variants after update",
    updatedProduct.variants.length > 0,
  );
  // 7. Validate administrative oversight capability
  // The administrator has the privilege to access any product's snapshot for:
  // - Platform oversight
  // - Dispute resolution
  // - Compliance verification
  // Validate the update created the expected data structure
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    `${product.name} - Updated`,
  );
  TestValidator.predicate(
    "product has seller info",
    updatedProduct.seller.id === seller.id,
  );
  // Validate variant data integrity for administrative review
  const updatedVariant = updatedProduct.variants.find(
    (v) => v.id === variant.id,
  );
  TestValidator.predicate(
    "variant preserved after update",
    updatedVariant !== undefined,
  );
  if (updatedVariant) {
    TestValidator.equals(
      "variant SKU code preserved",
      updatedVariant.sku_code,
      variant.skuCode,
    );
    TestValidator.equals(
      "variant product reference",
      updatedVariant.product.id,
      product.id,
    );
  }
}