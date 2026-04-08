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
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_history_with_multiple_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
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
  // 4. Add initial inventory restock (positive quantity)
  const restockQuantity = 100;
  const restockRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: restockQuantity,
          operationType: "restock",
          reason: "restock",
        },
        params: { variantId: variant.id },
      },
    );
  typia.assert(restockRecord);
  // 5. Add inventory adjustment (negative quantity)
  const adjustmentQuantity = 25;
  const adjustmentRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: adjustmentQuantity,
          operationType: "adjustment",
          reason: "adjustment",
        },
        params: { variantId: variant.id },
      },
    );
  typia.assert(adjustmentRecord);
  // 6. Get inventory history
  const historyResponse =
    await api.functional.ecommerceMall.seller.variants.inventory.history.at(
      sellerConnection,
      {
        variantId: variant.id,
      },
    );
  typia.assert(historyResponse);
  // 7. Validate response structure
  TestValidator.equals(
    "has pagination",
    historyResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(historyResponse.data),
    true,
  );
  // 8. Validate we have at least 2 records (restock and adjustment)
  TestValidator.predicate(
    "has at least 2 inventory records",
    historyResponse.data.length >= 2,
  );
  // 9. Validate record structure
  const firstRecord = historyResponse.data[0];
  TestValidator.predicate(
    "record has id (UUID)",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstRecord.id,
    ),
  );
  TestValidator.predicate(
    "record has quantityChange (integer)",
    typeof firstRecord.quantityChange === "number" &&
      Number.isInteger(firstRecord.quantityChange),
  );
  TestValidator.predicate(
    "record has reason (string)",
    typeof firstRecord.reason === "string",
  );
  TestValidator.predicate(
    "record has createdAt (ISO datetime)",
    !isNaN(Date.parse(firstRecord.createdAt)),
  );
  // 10. Validate records are sorted by createdAt descending (most recent first)
  for (let i = 1; i < historyResponse.data.length; i++) {
    const prevRecord = historyResponse.data[i - 1];
    const currRecord = historyResponse.data[i];
    const prevTime = new Date(prevRecord.createdAt).getTime();
    const currTime = new Date(currRecord.createdAt).getTime();
    TestValidator.predicate(
      `record ${i} is before record ${i - 1} (descending order)`,
      currTime <= prevTime,
    );
  }
  // 11. Validate both 'restock' and 'adjustment' reasons are present
  const reasons = historyResponse.data.map((r) => r.reason);
  TestValidator.predicate("has 'restock' reason", reasons.includes("restock"));
  TestValidator.predicate(
    "has 'adjustment' reason",
    reasons.includes("adjustment"),
  );
  // 12. Validate current stock calculation (sum of quantity changes)
  // Restock (+100) + Adjustment (-25) = +75 net change
  // Variant starts at 0, so current stock should be 75
  const totalQuantityChange = historyResponse.data.reduce(
    (sum, record) => sum + record.quantityChange,
    0,
  );
  TestValidator.equals(
    "net quantity change is correct (restock - adjustment)",
    totalQuantityChange,
    restockQuantity - adjustmentQuantity,
  );
  // 13. Validate expected records are in history
  const adjustmentRecordInHistory = historyResponse.data.find(
    (r) =>
      r.reason === "adjustment" && r.quantityChange === -adjustmentQuantity,
  );
  TestValidator.predicate(
    "adjustment record found in history",
    adjustmentRecordInHistory !== undefined,
  );
  const restockRecordInHistory = historyResponse.data.find(
    (r) => r.reason === "restock" && r.quantityChange === restockQuantity,
  );
  TestValidator.predicate(
    "restock record found in history",
    restockRecordInHistory !== undefined,
  );
}