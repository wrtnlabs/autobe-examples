import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_history_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create product with variant
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(8),
            price_override: null,
          } satisfies IEcommerceMallProductVariant.ICreate,
        ],
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant = product.variants[0];
  // Test: Get inventory history without filters
  const allRecords =
    await api.functional.ecommerceMall.seller.sellers.products.variants.inventory_history.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  // Test pagination structure
  TestValidator.equals(
    "pagination present",
    allRecords.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "data array present",
    Array.isArray(allRecords.data),
    true,
  );
  // Test: Filter by date range
  const now = new Date();
  const recentDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24,
  ).toISOString();
  const recentRecords =
    await api.functional.ecommerceMall.seller.sellers.products.variants.inventory_history.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
          startDate: recentDate,
          endDate: now.toISOString(),
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(recentRecords);
  // Test: Filter by reason code
  const restockRecords =
    await api.functional.ecommerceMall.seller.sellers.products.variants.inventory_history.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockRecords);
  // Test: Combined date and reason filtering
  const filteredRecords =
    await api.functional.ecommerceMall.seller.sellers.products.variants.inventory_history.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 20,
          startDate: recentDate,
          endDate: now.toISOString(),
          reason: "restock",
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(filteredRecords);
}
