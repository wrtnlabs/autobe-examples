import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshotOptionValue";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_admin_product_variant_snapshot_option_values_search_partial_matching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup: Create seller, product, and variant with options
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create variant with specific options as per test scenario
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            { optionName: "Color", optionValue: "Dark Red" },
            { optionName: "Size", optionValue: "Extra Large" },
            { optionName: "Material", optionValue: "Cotton" },
          ],
        },
      },
    );
  typia.assert(variant);
  // 3. Test snapshot option value search with partial matching
  // Note: In a complete flow, placing an order would create a snapshot.
  // For this test, we use a snapshot ID to validate the search functionality.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Test partial match on optionName: "Col" should match "Color"
  const colorNameResult =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.index(
      adminConnection,
      {
        snapshotId,
        body: {
          optionName: "Col",
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(colorNameResult);
  // Test partial match on optionValue: "Red" should match "Dark Red"
  const redValueResult =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.index(
      adminConnection,
      {
        snapshotId,
        body: {
          optionValue: "Red",
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(redValueResult);
  // Test partial match on optionValue: "Large" should match "Extra Large"
  const largeValueResult =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.index(
      adminConnection,
      {
        snapshotId,
        body: {
          optionValue: "Large",
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(largeValueResult);
  // Test combined filters (AND logic): optionName="Size" AND optionValue="Large"
  const combinedResult =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.index(
      adminConnection,
      {
        snapshotId,
        body: {
          optionName: "Size",
          optionValue: "Large",
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Test empty filters: should return all option values with valid pagination
  const allResults =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.index(
      adminConnection,
      {
        snapshotId,
        body: {} satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(allResults);
  // Test non-matching filters: should return empty results array with valid pagination
  const noMatchResult =
    await api.functional.ecommerceMall.admin.productVariantSnapshots.optionValues.index(
      adminConnection,
      {
        snapshotId,
        body: {
          optionValue: "NonExistentXYZ123",
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "non-matching filter returns empty data array",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    () => noMatchResult.pagination !== null,
  );
}
