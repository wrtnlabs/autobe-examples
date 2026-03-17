import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_variants_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test product variant filtering capabilities
  // 1. Seller joins and creates product with variants
  // 2. Test various filters: status, stock range, price range, SKU, is_default
  // 3. Test combined filters and pagination
  // 1. Seller registration
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Create product with categories
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variants with different attributes
  const statuses: ("active" | "inactive" | "discontinued")[] = [
    "active",
    "inactive",
    "discontinued",
  ];
  const sizes: string[] = ["S", "M", "L", "XL"];
  const colors: string[] = ["Red", "Blue", "Green", "Black"];
  await ArrayUtil.asyncRepeat(20, async (index: number) => {
    const variantData = {
      sku: `${RandomGenerator.alphabets(3).toUpperCase()}-${RandomGenerator.alphabets(3).toUpperCase()}-${index}`.toUpperCase(),
      options: {
        size: sizes[index % 4],
        color: colors[index % 4],
      },
      base_price: ((index * 1000) % 20000) + 1000,
      stock_quantity: (index * 7) % 100,
      status: statuses[index % 3],
      sort_order: index,
      is_default: index === 0,
    } satisfies IEcommerceMallProductVariant.ICreate;
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: variantData,
      },
    );
  });
  // 4. Test status filter - active
  const activeVariants =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          status: "active",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(activeVariants);
  activeVariants.data.forEach((v) =>
    TestValidator.equals("status active", v.status, "active"),
  );
  // 5. Test stock quantity range filter
  const lowStockVariants =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          stockQuantityMin: 0,
          stockQuantityMax: 20,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(lowStockVariants);
  lowStockVariants.data.forEach((v) => {
    TestValidator.predicate("stock min", v.stockQuantity >= 0);
    TestValidator.predicate("stock max", v.stockQuantity <= 20);
  });
  // 6. Test base price range filter
  const midPriceVariants =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          basePriceMin: 5000,
          basePriceMax: 15000,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(midPriceVariants);
  midPriceVariants.data.forEach((v) => {
    TestValidator.predicate("price min", v.basePrice >= 5000);
    TestValidator.predicate("price max", v.basePrice <= 15000);
  });
  // 7. Test SKU pattern filter (trigram search)
  const abcSkus =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          sku: "ABC",
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(abcSkus);
  // 8. Test is_default filter
  const defaultVariants =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          isDefault: true,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(defaultVariants);
  TestValidator.equals(
    "default variants count",
    defaultVariants.data.length,
    1,
  );
  TestValidator.predicate(
    "first is default",
    defaultVariants.data[0].isDefault === true,
  );
  // 9. Test combined filters (status + stock range)
  const activeLowStock =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 100,
          status: "active",
          stockQuantityMin: 0,
          stockQuantityMax: 20,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(activeLowStock);
  activeLowStock.data.forEach((v) => {
    TestValidator.equals("status active", v.status, "active");
    TestValidator.predicate(
      "stock within range",
      v.stockQuantity >= 0 && v.stockQuantity <= 20,
    );
  });
  // 10. Test pagination - page 1
  const page1 =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate("page 1 count correct", page1.data.length <= 5);
  TestValidator.predicate(
    "page 1 within records",
    page1.data.length <= page1.pagination.records,
  );
  // 11. Test pagination - page 2
  const page2 =
    await api.functional.ecommerceMall.seller.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallProductVariant.IRequest,
      },
    );
  typia.assert(page2);
  if (page1.pagination.records > 5) {
    TestValidator.predicate("page 2 has data", page2.data.length > 0);
  }
  // 12. Verify pagination metadata
  TestValidator.predicate("records positive", page1.pagination.records > 0);
  TestValidator.predicate("limit valid", page1.pagination.limit > 0);
  TestValidator.predicate(
    "pages consistent",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
}
