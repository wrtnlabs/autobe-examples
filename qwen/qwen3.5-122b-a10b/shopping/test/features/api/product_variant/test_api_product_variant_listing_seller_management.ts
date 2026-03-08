import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariant";
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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_product_variant_listing_seller_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Login seller
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.seller.email,
      password: sellerAuth.seller.email.split("@")[0] + "1234!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates product with multiple variants
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. List all variants (primary success path)
  const allVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(allVariants);
  // Validate pagination
  TestValidator.equals(
    "pagination current page",
    allVariants.pagination.current,
    1,
  );
  TestValidator.predicate("has variants", allVariants.data.length > 0);
  TestValidator.equals(
    "pagination records matches data",
    allVariants.pagination.records,
    allVariants.data.length,
  );
  // Validate variant structure
  await ArrayUtil.asyncForEach(allVariants.data, async (variant) => {
    TestValidator.predicate("has valid id", variant.id.length > 0);
    TestValidator.predicate("has sku code", variant.sku_code.length > 0);
    TestValidator.predicate(
      "has stock quantity",
      typeof variant.stock_quantity === "number",
    );
    TestValidator.predicate(
      "has option values",
      typeof variant.option_values === "object",
    );
  });
  // 5. Filter by stock quantity (variant management context)
  const inStockVariants =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          stock_quantity: 0,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(inStockVariants);
  TestValidator.predicate(
    "in-stock filter returns variants",
    inStockVariants.data.length > 0,
  );
  // 6. Sort by price (variant management context)
  const sortedByPrice =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sort_by: "price",
          sort_order: "asc",
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(sortedByPrice);
  // Validate sorting
  const prices = sortedByPrice.data.map((v) => v.price ?? 0);
  for (let i = 1; i < prices.length; i++) {
    TestValidator.predicate(
      `price at index ${i} >= index ${i - 1}`,
      prices[i] >= prices[i - 1],
    );
  }
  // 7. Pagination test with many variants
  const paginatedPage1 =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(paginatedPage1);
  TestValidator.equals("page 1 limit", paginatedPage1.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 has max 5 items",
    paginatedPage1.data.length <= 5,
  );
  const paginatedPage2 =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(paginatedPage2);
  TestValidator.notEquals(
    "page 2 has different data",
    paginatedPage1.data,
    paginatedPage2.data,
  );
  // 8. SKU code filtering
  if (allVariants.data.length > 0) {
    const firstSku = allVariants.data[0].sku_code;
    const filteredBySku =
      await api.functional.ecommerceMall.products.variants.index(
        sellerConnection,
        {
          productId: product.id,
          body: {
            sku_code: firstSku.substring(0, 3),
            page: 1,
            limit: 100,
          } satisfies IEcommerceMallProductVariant.IRequest,
        },
      );
    typia.assert(filteredBySku);
    TestValidator.predicate(
      "SKU filter returns matching variants",
      filteredBySku.data.length > 0,
    );
  }
  // 9. Price range filtering
  const priceFiltered =
    await api.functional.ecommerceMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          price_min: 0,
          price_max: 1000000,
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(priceFiltered);
  TestValidator.predicate(
    "price filter returns variants",
    priceFiltered.data.length > 0,
  );
}
