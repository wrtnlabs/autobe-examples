import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
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

export async function test_api_inventory_record_seller_view_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Admin creates a category (prerequisite for product)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        basePrice: typia.random<
          number & tags.Type<"double"> & tags.Minimum<0>
        >(),
        categoryId: category.id,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10).toUpperCase(),
          options: [],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Query inventory records with filters (quantityDirection='positive' for restocking)
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const inventoryRecords =
    await api.functional.ecommerceMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
          quantityDirection: "positive",
          dateRangeFrom: oneDayAgo.toISOString(),
          dateRangeTo: oneDayLater.toISOString(),
          page: 1,
          limit: 20,
          sortDirection: "desc",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords);
  // 7. Verify filtering by quantityDirection correctly returns only positive inventory changes
  for (const record of inventoryRecords.pagination.records > 0
    ? inventoryRecords.data
    : []) {
    TestValidator.predicate(
      "quantityChange is positive when filter is positive",
      record.quantityChange > 0,
    );
  }
  // 8. Test filtering by variantId - verify records match the filtered variant
  const variantFilterRecords =
    await api.functional.ecommerceMall.seller.inventory_records.index(
      sellerConnection,
      {
        body: {
          variantId: variant.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(variantFilterRecords);
  for (const record of variantFilterRecords.pagination.records > 0
    ? variantFilterRecords.data
    : []) {
    TestValidator.equals(
      "record variant matches filter variantId",
      record.variant.id,
      variant.id,
    );
  }
}
