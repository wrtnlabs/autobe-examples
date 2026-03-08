import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_product_variant_stock_status_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Re-authenticate with seller credentials for variant operations
  const variantConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(variantConnection, {
    body: {
      email: seller.email,
      password: seller.token.refresh,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Generate a product ID (use random UUID)
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create multiple variants with different attributes
  const variants: IEcommerceMallProductVariant[] = [];
  // Create variant 1: high stock, early creation
  const variant1 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      variantConnection,
      {
        productId,
        body: {
          sku_code: "SKU-A-001",
          option_values: { size: "Large", color: "Red" },
          stock_quantity: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  variants.push(variant1);
  // Wait to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create variant 2: low stock
  const variant2 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      variantConnection,
      {
        productId,
        body: {
          sku_code: "SKU-A-002",
          option_values: { size: "Medium", color: "Blue" },
          stock_quantity: 5,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  variants.push(variant2);
  // Wait to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create variant 3: zero stock
  const variant3 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      variantConnection,
      {
        productId,
        body: {
          sku_code: "SKU-A-003",
          option_values: { size: "Small", color: "Green" },
          stock_quantity: 0,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant3);
  variants.push(variant3);
  // Wait to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create variant 4: medium stock, later SKU
  const variant4 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      variantConnection,
      {
        productId,
        body: {
          sku_code: "SKU-A-010",
          option_values: { size: "Extra Large", color: "Black" },
          stock_quantity: 50,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant4);
  variants.push(variant4);
  // Wait to ensure different created_at
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create variant 5: medium stock, earlier SKU than variant4
  const variant5 =
    await api.functional.ecommerceMall.seller.products.variants.create(
      variantConnection,
      {
        productId,
        body: {
          sku_code: "SKU-A-005",
          option_values: { size: "Medium", color: "White" },
          stock_quantity: 25,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant5);
  variants.push(variant5);
  // 4. Test default sorting (stock_quantity DESC)
  const defaultSortResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultSortResult);
  TestValidator.equals(
    "default sort - highest stock first",
    defaultSortResult.data[0].stockQuantity,
    100,
  );
  TestValidator.equals(
    "default sort - second highest",
    defaultSortResult.data[1].stockQuantity,
    50,
  );
  TestValidator.equals(
    "default sort - third highest",
    defaultSortResult.data[2].stockQuantity,
    25,
  );
  TestValidator.equals(
    "default sort - fourth",
    defaultSortResult.data[3].stockQuantity,
    5,
  );
  TestValidator.equals(
    "default sort - lowest stock last",
    defaultSortResult.data[4].stockQuantity,
    0,
  );
  // 5. Test stock_quantity ASC sorting
  const stockAscResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "stock_quantity",
          sortOrder: "ASC",
        },
      },
    );
  typia.assert(stockAscResult);
  TestValidator.equals(
    "stock ASC - lowest stock first",
    stockAscResult.data[0].stockQuantity,
    0,
  );
  TestValidator.equals(
    "stock ASC - second lowest",
    stockAscResult.data[1].stockQuantity,
    5,
  );
  TestValidator.equals(
    "stock ASC - last is highest",
    stockAscResult.data[4].stockQuantity,
    100,
  );
  // 6. Test sku_code ASC sorting
  const skuAscResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "sku_code",
          sortOrder: "ASC",
        },
      },
    );
  typia.assert(skuAscResult);
  TestValidator.equals(
    "sku ASC - first alphabetically",
    skuAscResult.data[0].skuCode,
    "SKU-A-001",
  );
  TestValidator.equals(
    "sku ASC - second",
    skuAscResult.data[1].skuCode,
    "SKU-A-002",
  );
  TestValidator.equals(
    "sku ASC - third",
    skuAscResult.data[2].skuCode,
    "SKU-A-005",
  );
  TestValidator.equals(
    "sku ASC - last alphabetically",
    skuAscResult.data[4].skuCode,
    "SKU-A-010",
  );
  // 7. Test sku_code DESC sorting
  const skuDescResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "sku_code",
          sortOrder: "DESC",
        },
      },
    );
  typia.assert(skuDescResult);
  TestValidator.equals(
    "sku DESC - first reverse alphabetically",
    skuDescResult.data[0].skuCode,
    "SKU-A-010",
  );
  TestValidator.equals(
    "sku DESC - second reverse",
    skuDescResult.data[1].skuCode,
    "SKU-A-005",
  );
  TestValidator.equals(
    "sku DESC - last reverse alphabetically",
    skuDescResult.data[4].skuCode,
    "SKU-A-001",
  );
  // 8. Test created_at ASC sorting (oldest first)
  const createdAscResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "ASC",
        },
      },
    );
  typia.assert(createdAscResult);
  TestValidator.equals(
    "created_at ASC - oldest first",
    createdAscResult.data[0].skuCode,
    "SKU-A-001",
  );
  TestValidator.equals(
    "created_at ASC - second oldest",
    createdAscResult.data[1].skuCode,
    "SKU-A-002",
  );
  TestValidator.equals(
    "created_at ASC - newest last",
    createdAscResult.data[4].skuCode,
    "SKU-A-005",
  );
  // 9. Test created_at DESC sorting (newest first)
  const createdDescResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "DESC",
        },
      },
    );
  typia.assert(createdDescResult);
  TestValidator.equals(
    "created_at DESC - newest first",
    createdDescResult.data[0].skuCode,
    "SKU-A-005",
  );
  TestValidator.equals(
    "created_at DESC - second newest",
    createdDescResult.data[1].skuCode,
    "SKU-A-010",
  );
  TestValidator.equals(
    "created_at DESC - oldest last",
    createdDescResult.data[4].skuCode,
    "SKU-A-001",
  );
  // 10. Test updated_at ASC sorting
  const updatedAscResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "updated_at",
          sortOrder: "ASC",
        },
      },
    );
  typia.assert(updatedAscResult);
  TestValidator.equals(
    "updated_at ASC - oldest first",
    updatedAscResult.data[0].skuCode,
    "SKU-A-001",
  );
  // 11. Test updated_at DESC sorting
  const updatedDescResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "updated_at",
          sortOrder: "DESC",
        },
      },
    );
  typia.assert(updatedDescResult);
  TestValidator.equals(
    "updated_at DESC - newest first",
    updatedDescResult.data[0].skuCode,
    "SKU-A-005",
  );
  // 12. Verify pagination works with sort
  const paginatedResult =
    await api.functional.ecommerceMall.seller.product_variants.stock_status.index(
      variantConnection,
      {
        body: {
          sortBy: "stock_quantity",
          sortOrder: "DESC",
          pageSize: 2,
        },
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination with sort - page size respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination with sort - first item correct",
    paginatedResult.data[0].stockQuantity,
    100,
  );
  TestValidator.equals(
    "pagination with sort - second item correct",
    paginatedResult.data[1].stockQuantity,
    50,
  );
}
