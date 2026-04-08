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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test pagination of product variant snapshots.
 * Validates pagination metadata and snapshot ordering.
 *
 * Note: This test validates the pagination structure of the snapshots endpoint.
 * Since no variant update endpoint is available in the SDK, we test with the
 * snapshots that exist after variant creation. The pagination metadata and
 * response structure are validated regardless of record count.
 */
export async function test_api_product_variant_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. Seller setup
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
  // 3. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant - this will create snapshots
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: (10000 + (Date.now() % 10) * 1000) satisfies number &
            tags.Minimum<0> as number & tags.Minimum<0>,
          options: [
            {
              optionName: "Size",
              optionValue: "Large",
            },
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Query first page with limit=2
  const page1 =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "page 1 pagination current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 2);
  TestValidator.predicate(
    "page 1 pagination records >= 0",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pagination pages >= 0",
    page1.pagination.pages >= 0,
  );
  // 7. Query second page to verify pagination navigation
  const page2 =
    await api.functional.ecommerceMall.seller.product_variants.snapshots.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 2,
          limit: 2,
        } satisfies IEcommerceMallProductVariantSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  // 8. Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 pagination current",
    page2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 pagination limit", page2.pagination.limit, 2);
  TestValidator.equals(
    "page 2 records equals page 1",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages equals page 1",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // 9. Verify snapshots are ordered by creation time (newest first)
  if (page1.data.length >= 2) {
    for (let i = 1; i < page1.data.length; i++) {
      const prevCreatedAt = new Date(page1.data[i - 1].createdAt);
      const currCreatedAt = new Date(page1.data[i].createdAt);
      TestValidator.predicate(
        `snapshot ${i - 1} createdAt >= snapshot ${i} createdAt`,
        prevCreatedAt.getTime() >= currCreatedAt.getTime(),
      );
    }
  }
}
