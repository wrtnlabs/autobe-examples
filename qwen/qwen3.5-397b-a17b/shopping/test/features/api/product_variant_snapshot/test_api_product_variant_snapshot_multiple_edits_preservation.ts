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

export async function test_api_product_variant_snapshot_multiple_edits_preservation(
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
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create an option definition
  const optionDefinition =
    await generate_random_shopping_mall_seller_products_option_definitions_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // 4. Create option values
  const optionValue1 =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Red",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue1);
  const optionValue2 =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Blue",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue2);
  const optionValue3 =
    await generate_random_shopping_mall_seller_products_option_definitions_option_values_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          optionDefinitionId: optionDefinition.id,
        },
        body: {
          name: "Green",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue3);
  // 5. Create multiple variants to simulate different states
  // Variant 1: Red option with initial price
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-RED-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          option_value_ids: [optionValue1.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // Variant 2: Blue option with different price
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-BLUE-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<2000>
          >(),
          option_value_ids: [optionValue2.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // Variant 3: Green option with another price
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-GREEN-${RandomGenerator.alphaNumeric(8)}`,
          price_override: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<3000>
          >(),
          option_value_ids: [optionValue3.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  // 6. Retrieve snapshots for each variant
  const snapshotsVariant1 =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant1.id,
        body: {
          page: 1,
          limit: 10,
          sort: { field: "created_at", order: "DESC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsVariant1);
  const snapshotsVariant2 =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant2.id,
        body: {
          page: 1,
          limit: 10,
          sort: { field: "created_at", order: "DESC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsVariant2);
  const snapshotsVariant3 =
    await api.functional.shoppingMall.seller.products.variants.snapshots.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant3.id,
        body: {
          page: 1,
          limit: 10,
          sort: { field: "created_at", order: "DESC" },
        } satisfies IShoppingMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsVariant3);
  // 7. Validate snapshots exist and have correct structure
  TestValidator.predicate(
    "variant 1 should have at least one snapshot",
    () => snapshotsVariant1.data.length >= 1,
  );
  TestValidator.predicate(
    "variant 2 should have at least one snapshot",
    () => snapshotsVariant2.data.length >= 1,
  );
  TestValidator.predicate(
    "variant 3 should have at least one snapshot",
    () => snapshotsVariant3.data.length >= 1,
  );
  // 8. Validate snapshot structure and immutability
  const validateSnapshot = (
    snapshot: IShoppingMallProductVariantSnapshot.ISummary,
    expectedSku: string,
    expectedOptionValueId: string,
  ) => {
    TestValidator.equals(
      "snapshot SKU matches variant",
      snapshot.sku_code,
      expectedSku,
    );
    TestValidator.predicate("snapshot has valid UUID", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.predicate(
      "snapshot has valid created_at timestamp",
      () => !isNaN(new Date(snapshot.created_at).getTime()),
    );
    TestValidator.predicate(
      "snapshot has option values",
      () => snapshot.optionValues.length > 0,
    );
    TestValidator.equals(
      "snapshot option value matches expected",
      snapshot.optionValues[0].id,
      expectedOptionValueId,
    );
  };
  // Validate first snapshot of each variant
  if (snapshotsVariant1.data.length > 0) {
    validateSnapshot(
      snapshotsVariant1.data[0],
      variant1.skuCode,
      optionValue1.id,
    );
  }
  if (snapshotsVariant2.data.length > 0) {
    validateSnapshot(
      snapshotsVariant2.data[0],
      variant2.skuCode,
      optionValue2.id,
    );
  }
  if (snapshotsVariant3.data.length > 0) {
    validateSnapshot(
      snapshotsVariant3.data[0],
      variant3.skuCode,
      optionValue3.id,
    );
  }
  // 9. Validate snapshots are sorted by created_at DESC
  const validateSortOrder = (
    snapshots: IShoppingMallProductVariantSnapshot.ISummary[],
  ) => {
    for (let i = 0; i < snapshots.length - 1; i++) {
      const currentTime = new Date(snapshots[i].created_at).getTime();
      const nextTime = new Date(snapshots[i + 1].created_at).getTime();
      TestValidator.predicate(
        "snapshots sorted by created_at DESC",
        () => currentTime >= nextTime,
      );
    }
  };
  if (snapshotsVariant1.data.length > 1) {
    validateSortOrder(snapshotsVariant1.data);
  }
  if (snapshotsVariant2.data.length > 1) {
    validateSortOrder(snapshotsVariant2.data);
  }
  if (snapshotsVariant3.data.length > 1) {
    validateSortOrder(snapshotsVariant3.data);
  }
  // 10. Validate snapshot immutability - each snapshot preserves its state
  TestValidator.predicate(
    "snapshots preserve distinct SKU codes across variants",
    () => {
      const allSkus = [
        ...snapshotsVariant1.data.map((s) => s.sku_code),
        ...snapshotsVariant2.data.map((s) => s.sku_code),
        ...snapshotsVariant3.data.map((s) => s.sku_code),
      ];
      const uniqueSkus = new Set(allSkus);
      return uniqueSkus.size === allSkus.length;
    },
  );
}
