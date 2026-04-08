import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
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

export async function test_api_product_variant_snapshot_option_values_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // 2. Create product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 4. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<number>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create variant with multiple options: Color=Red, Size=Large, Material=Cotton
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: typia.random<number & tags.Minimum<0>>(),
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Material",
              optionValue: "Cotton",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Edit variant to trigger automatic snapshot creation
  const editedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        productVariantId: variant.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: variant.price,
          options: [
            {
              optionName: "Color",
              optionValue: "Blue",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Size",
              optionValue: "Large",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
            {
              optionName: "Material",
              optionValue: "Silk",
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(editedVariant);
  // 7. List snapshots to obtain the snapshotId
  const snapshots =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "should have at least one snapshot",
    snapshots.data.length >= 1,
    true,
  );
  const snapshotId = snapshots.data[0].id;
  // 8. Test scenario: Filter by optionName='Color' to retrieve only color-related options
  const colorOptions =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId,
        body: {
          optionName: "Color",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(colorOptions);
  TestValidator.predicate(
    "color filter should return results",
    colorOptions.data.length > 0,
  );
  TestValidator.predicate(
    "all returned options should have optionName 'Color'",
    colorOptions.data.every((opt) => opt.option_name === "Color"),
  );
  // 9. Test scenario: Filter by optionValue='Red' for exact matches (from snapshot, should have Red)
  const redOptions =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId,
        body: {
          optionValue: "Red",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(redOptions);
  TestValidator.predicate(
    "red filter should return results with Red option",
    redOptions.data.some((opt) => opt.option_value === "Red"),
  );
  // 10. Test scenario: Test partial matching by searching optionValue='La' which should match 'Large'
  const largePartialOptions =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId,
        body: {
          optionValue: "La",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(largePartialOptions);
  TestValidator.predicate(
    "partial 'La' filter should match 'Large'",
    largePartialOptions.data.some((opt) =>
      opt.option_value.toLowerCase().includes("la"),
    ),
  );
  // 11. Test scenario: Verify filtering by non-existent option names returns empty results
  const nonexistentOptions =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId,
        body: {
          optionName: "NonExistentAttributeXYZ123",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(nonexistentOptions);
  TestValidator.equals(
    "non-existent option name should return empty results",
    nonexistentOptions.data.length,
    0,
  );
  // 12. Test scenario: Verify case-insensitive partial matching - search with lowercase 'large'
  const lowercaseOptions =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId,
        body: {
          optionValue: "large",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(lowercaseOptions);
  TestValidator.predicate(
    "lowercase 'large' should match 'Large' (case-insensitive)",
    lowercaseOptions.data.some(
      (opt) => opt.option_value.toLowerCase() === "large",
    ),
  );
}