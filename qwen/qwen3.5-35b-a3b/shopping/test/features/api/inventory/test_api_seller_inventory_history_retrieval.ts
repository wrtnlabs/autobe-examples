import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_inventory_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
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
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 6,
        }),
        description: typia.random<string | null | undefined>(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        is_active: true,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: typia.random<string & tags.MaxLength<50>>(),
          option_values: { size: "Large", color: "Blue" },
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          price_override: typia.random<number | null | undefined>(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Retrieve inventory history (default: newest first)
  const inventoryDefault =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {},
      },
    );
  typia.assert(inventoryDefault);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current",
    inventoryDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    inventoryDefault.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records",
    inventoryDefault.pagination.records,
    inventoryDefault.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    inventoryDefault.pagination.pages > 0,
  );
  // Validate inventory records structure
  TestValidator.equals(
    "records count",
    inventoryDefault.data.length,
    inventoryDefault.pagination.records,
  );
  for (const record of inventoryDefault.data) {
    TestValidator.predicate(
      "record has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        record.id,
      ),
    );
    TestValidator.equals(
      "record variant_id matches",
      record.variant_id,
      variant.id,
    );
    TestValidator.predicate(
      "record has signed integer quantity_change",
      Number.isInteger(record.quantity_change),
    );
    TestValidator.predicate(
      "record has valid reason",
      [
        "order_fulfillment",
        "cancellation",
        "refund",
        "restocking",
        "adjustment",
      ].includes(record.reason),
    );
    TestValidator.predicate(
      "record has valid timestamp format",
      !isNaN(Date.parse(record.timestamp)),
    );
    TestValidator.predicate(
      "record has signed integer current_stock",
      Number.isInteger(record.current_stock),
    );
  }
  // 5. Validate sortBy parameter (oldest first)
  const inventoryOldest =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: { sortBy: "oldest" },
      },
    );
  typia.assert(inventoryOldest);
  TestValidator.equals(
    "pagination records with oldest sort",
    inventoryOldest.data.length,
    inventoryDefault.data.length,
  );
  // 6. Validate dateRange filter
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const inventoryDateFiltered =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          dateRange: {
            start: yesterday.toISOString(),
            end: today.toISOString(),
          },
        },
      },
    );
  typia.assert(inventoryDateFiltered);
  // 7. Validate pagination with custom page and limit
  const inventoryPaged =
    await api.functional.ecommerceMall.seller.variants.inventoryRecords.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(inventoryPaged);
  TestValidator.equals(
    "pagination current with page 2",
    inventoryPaged.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit with 5",
    inventoryPaged.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records for page 2",
    inventoryPaged.pagination.records > 5,
  );
}