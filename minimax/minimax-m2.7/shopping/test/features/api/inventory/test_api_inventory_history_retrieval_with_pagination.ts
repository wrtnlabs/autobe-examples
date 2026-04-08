import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_history_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Create initial inventory record (restock with quantity 100)
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant.id },
        body: {
          quantity: 100 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          operationType: "restock" as const,
          reason: "initial_restock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Retrieve inventory history with empty request body (no filters, default pagination)
  const historyResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.index(
      sellerConnection,
      {
        variantId: variant.id,
        body: {} satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(historyResponse);
  // Validate response structure
  TestValidator.equals(
    "has pagination metadata",
    historyResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(historyResponse.data),
  );
  TestValidator.equals(
    "has at least one record",
    historyResponse.data.length >= 1,
    true,
  );
  // Validate pagination metadata - note: pagination.pagination contains the actual IPage.IPagination
  TestValidator.equals(
    "current page is valid",
    historyResponse.pagination.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "limit is valid",
    historyResponse.pagination.pagination.limit >= 1,
    true,
  );
  TestValidator.equals(
    "records count is valid",
    historyResponse.pagination.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count is valid",
    historyResponse.pagination.pagination.pages >= 0,
    true,
  );
  // Validate first record structure
  const firstRecord = historyResponse.data[0];
  TestValidator.equals("record has id", firstRecord.id !== undefined, true);
  TestValidator.equals(
    "record has quantityChange",
    firstRecord.quantityChange !== undefined,
    true,
  );
  TestValidator.equals(
    "record has reason",
    firstRecord.reason !== undefined,
    true,
  );
  TestValidator.equals(
    "record has createdAt",
    firstRecord.createdAt !== undefined,
    true,
  );
  // Validate records are sorted by createdAt descending (most recent first)
  for (let i = 1; i < historyResponse.data.length; i++) {
    const prev = new Date(historyResponse.data[i - 1].createdAt);
    const curr = new Date(historyResponse.data[i].createdAt);
    TestValidator.predicate(
      `record ${i} is older or equal to record ${i - 1}`,
      prev >= curr,
    );
  }
}
