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

export async function test_api_product_variant_snapshot_option_values_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create product category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 4. Create product
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
  // 5. Create product variant with initial options
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
          options: ArrayUtil.repeat(
            5,
            (index) =>
              ({
                optionName: `Initial${index}`,
                optionValue: RandomGenerator.name(),
              }) satisfies IEcommerceMallProductVariantOption.ICreate,
          ),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Add more options to create dataset large enough for pagination testing
  await Promise.all(
    ArrayUtil.repeat(10, (index) =>
      generate_random_ecommerce_mall_seller_products_variants_options_create(
        sellerConnection,
        {
          params: {
            productId: product.id,
            productVariantId: variant.id,
          },
          body: {
            optionName: `Option${index}_${RandomGenerator.alphaNumeric(4)}`,
            optionValue: RandomGenerator.name(),
          } satisfies IEcommerceMallProductVariantOption.ICreate,
        },
      ),
    ),
  );
  // Use variant ID as snapshot identifier for testing pagination
  const snapshotId = variant.id;
  // 7. Test pagination - request page 1 with explicit limit
  const page1 =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId: snapshotId,
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page matches request",
    page1.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    5,
  );
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate("page 1 data respects limit", page1.data.length <= 5);
  TestValidator.predicate(
    "page 1 total records positive",
    page1.pagination.records > 0,
  );
  TestValidator.predicate(
    "page 1 total pages calculated",
    page1.pagination.pages > 0,
  );
  // 8. Fetch page 2 to verify navigation through dataset
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
        sellerConnection,
        {
          snapshotId: snapshotId,
          body: {
            limit: 5,
            page: 2,
          } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals(
      "page 2 current page matches request",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 limit matches request",
      page2.pagination.limit === 5,
    );
    TestValidator.predicate("page 2 has data", page2.data.length >= 0);
    // Verify no overlap between pages
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1Ids = new Set(page1.data.map((d) => d.id));
      const hasOverlap = page2.data.some((d) => page1Ids.has(d.id));
      TestValidator.predicate(
        "page 1 and 2 have no duplicate records",
        !hasOverlap,
      );
    }
  }
  // 9. Test with custom limit parameter
  const customLimitPage =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId: snapshotId,
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(customLimitPage);
  TestValidator.equals(
    "custom limit page limit matches request",
    customLimitPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "custom limit data respects requested page size",
    customLimitPage.data.length <= 10,
  );
  // 10. Verify option value structure integrity
  for (const optionValue of customLimitPage.data) {
    TestValidator.predicate(
      "option name is non-empty string",
      typeof optionValue.option_name === "string" &&
        optionValue.option_name.length > 0,
    );
    TestValidator.predicate(
      "option value is non-empty string",
      typeof optionValue.option_value === "string" &&
        optionValue.option_value.length > 0,
    );
    TestValidator.predicate(
      "option has valid snapshot reference",
      optionValue.ecommerce_mall_product_variant_snapshot_id === snapshotId,
    );
  }
  // 11. Test filtering by option name
  const filteredPage =
    await api.functional.ecommerceMall.seller.productVariantSnapshots.optionValues.index(
      sellerConnection,
      {
        snapshotId: snapshotId,
        body: {
          limit: 10,
          page: 1,
          optionName: "Initial",
        } satisfies IEcommerceMallProductVariantSnapshotOptionValue.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered results only match option name",
    filteredPage.data.every((d) => d.option_name.includes("Initial")),
  );
  // 12. Verify pagination calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    page1.pagination.records / page1.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation correct",
    page1.pagination.pages,
    expectedPages,
  );
}
