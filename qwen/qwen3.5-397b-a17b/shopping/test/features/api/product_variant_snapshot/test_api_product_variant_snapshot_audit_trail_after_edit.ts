import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that a seller can retrieve the complete audit trail of variant snapshots after editing a product variant.
 *
 * This test verifies:
 * 1. Seller authentication and authorization
 * 2. Product creation with required fields
 * 3. Option definition creation for product variants
 * 4. Option value creation under the option definition
 * 5. Variant creation with SKU code and option values
 * 6. Variant update triggering snapshot creation
 * 7. Snapshot retrieval with proper pagination and sorting
 * 8. Snapshot data integrity and immutability
 */
export async function test_api_product_variant_snapshot_audit_trail_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create an option definition (e.g., 'Color')
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Color",
        },
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option values (e.g., 'Red', 'Blue')
  const optionValueRed =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Red",
        },
      },
    );
  typia.assert(optionValueRed);
  const optionValueBlue =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Blue",
        },
      },
    );
  typia.assert(optionValueBlue);
  // 5. Create a variant with SKU code and option values
  const initialSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: initialSkuCode,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [optionValueRed.id],
        },
      },
    );
  typia.assert(variant);
  // 6. Update the variant to trigger snapshot creation
  const updatedSkuCode = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSkuCode,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Verify the update was applied
  TestValidator.equals(
    "SKU code updated",
    updatedVariant.skuCode,
    updatedSkuCode,
  );
  TestValidator.notEquals(
    "SKU code changed",
    variant.skuCode,
    updatedVariant.skuCode,
  );
  // 7. Retrieve the variant snapshots list
  const snapshotsResponse =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
          sort: {
            field: "created_at",
            order: "DESC",
          },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 8. Validate snapshot data - business logic only (type validation done by typia.assert)
  TestValidator.predicate(
    "at least one snapshot exists",
    () => snapshotsResponse.data.length >= 1,
  );
  // Validate snapshot captures the original SKU code before update
  const snapshot = snapshotsResponse.data[0];
  TestValidator.equals(
    "snapshot SKU matches original",
    snapshot.sku_code,
    initialSkuCode,
  );
  // Validate option values in snapshot match the variant's option values
  const snapshotOptionValue = snapshot.optionValues[0];
  TestValidator.equals(
    "option value ID matches",
    snapshotOptionValue.id,
    optionValueRed.id,
  );
  TestValidator.equals(
    "option value name matches",
    snapshotOptionValue.name,
    "Red",
  );
  // Validate pagination structure - business logic checks
  TestValidator.predicate(
    "pagination has valid current page",
    () => snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    () => snapshotsResponse.pagination.limit >= 1,
  );
  // Validate sorting order (DESC - newest first) if multiple snapshots exist
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const prevDate = new Date(
        snapshotsResponse.data[i - 1].created_at,
      ).getTime();
      const currDate = new Date(snapshotsResponse.data[i].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is older than snapshot ${i - 1}`,
        () => prevDate >= currDate,
      );
    }
  }
}
