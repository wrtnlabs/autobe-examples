import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_inventory_record_query_with_reason_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant under the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          options: ArrayUtil.repeat(2, (index) => ({
            key: index === 0 ? "color" : "size",
            value: index === 0 ? "Red" : "Large",
          })),
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Query all inventory records without filters
  const allRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          page: 1,
          limit: 100,
          sort: "created_at,desc",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(allRecords);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    allRecords.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(allRecords.data));
  TestValidator.equals("current page", allRecords.pagination.current, 1);
  TestValidator.predicate("limit is set", allRecords.pagination.limit > 0);
  TestValidator.predicate(
    "total records is non-negative",
    allRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    allRecords.pagination.pages >= 0,
  );
  // 5. Test filtering by reason code - RESTOCK
  const restockRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "RESTOCK",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockRecords);
  // Validate all returned records have RESTOCK reason
  for (const record of restockRecords.data) {
    TestValidator.equals("RESTOCK reason filter", record.reason, "RESTOCK");
    TestValidator.predicate(
      "RESTOCK has positive quantity",
      record.quantity_change > 0,
    );
  }
  // 6. Test filtering by reason code - ORDER
  const orderRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "ORDER",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(orderRecords);
  for (const record of orderRecords.data) {
    TestValidator.equals("ORDER reason filter", record.reason, "ORDER");
    TestValidator.predicate(
      "ORDER has negative quantity",
      record.quantity_change < 0,
    );
  }
  // 7. Test filtering by reason code - CANCELLATION
  const cancellationRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "CANCELLATION",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(cancellationRecords);
  for (const record of cancellationRecords.data) {
    TestValidator.equals(
      "CANCELLATION reason filter",
      record.reason,
      "CANCELLATION",
    );
    TestValidator.predicate(
      "CANCELLATION has positive quantity",
      record.quantity_change > 0,
    );
  }
  // 8. Test filtering by reason code - REFUND
  const refundRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "REFUND",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(refundRecords);
  for (const record of refundRecords.data) {
    TestValidator.equals("REFUND reason filter", record.reason, "REFUND");
    TestValidator.predicate(
      "REFUND has positive quantity",
      record.quantity_change > 0,
    );
  }
  // 9. Test filtering by reason code - ADJUSTMENT
  const adjustmentRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "ADJUSTMENT",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(adjustmentRecords);
  for (const record of adjustmentRecords.data) {
    TestValidator.equals(
      "ADJUSTMENT reason filter",
      record.reason,
      "ADJUSTMENT",
    );
    TestValidator.predicate(
      "ADJUSTMENT has negative quantity",
      record.quantity_change < 0,
    );
  }
  // 10. Test filtering by reason code - LOSS
  const lossRecords =
    await api.functional.shoppingMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "LOSS",
          page: 1,
          limit: 50,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(lossRecords);
  for (const record of lossRecords.data) {
    TestValidator.equals("LOSS reason filter", record.reason, "LOSS");
    TestValidator.predicate(
      "LOSS has negative quantity",
      record.quantity_change < 0,
    );
  }
  // 11. Validate record structure exists when records are present
  if (allRecords.data.length > 0) {
    const sampleRecord = allRecords.data[0];
    TestValidator.predicate("record has id", sampleRecord.id !== undefined);
    TestValidator.predicate(
      "record has quantity_change",
      sampleRecord.quantity_change !== undefined,
    );
    TestValidator.predicate(
      "record has reason",
      sampleRecord.reason !== undefined,
    );
    TestValidator.predicate(
      "record has created_at",
      sampleRecord.created_at !== undefined,
    );
  }
}
