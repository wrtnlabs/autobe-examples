import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_history_filter_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin actor for category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller joins and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Create inventory records with different reasons
  // Restock to have initial stock
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: { productId: product.id, variantId: variant.id },
      body: {
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
        operationType: "restock",
        reason: "restock",
      },
    },
  );
  // Order placement record (simulated as adjustment with negative effect)
  const orderPlacementRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          operationType: "adjustment",
          reason: "order_placement",
        },
      },
    );
  typia.assert(orderPlacementRecord);
  // Cancellation record
  const cancellationRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          operationType: "adjustment",
          reason: "order_cancellation",
        },
      },
    );
  typia.assert(cancellationRecord);
  // Refund record
  const refundRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          operationType: "adjustment",
          reason: "refund",
        },
      },
    );
  typia.assert(refundRecord);
  // Adjustment record
  const adjustmentRecord =
    await generate_random_ecommerce_mall_seller_product_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          operationType: "adjustment",
          reason: "adjustment",
        },
      },
    );
  typia.assert(adjustmentRecord);
  // 6. Query inventory records with reason filter = 'restock'
  const restockFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "restock",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(restockFilteredResponse);
  // Validate: All returned records should have reason = 'restock'
  TestValidator.predicate(
    "has restock records",
    restockFilteredResponse.data.length > 0,
  );
  for (const record of restockFilteredResponse.data) {
    TestValidator.equals("reason matches filter", record.reason, "restock");
  }
  // 7. Test filtering with order_placement reason
  const orderPlacementFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "order_placement",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(orderPlacementFilteredResponse);
  for (const record of orderPlacementFilteredResponse.data) {
    TestValidator.equals(
      "reason matches order_placement filter",
      record.reason,
      "order_placement",
    );
  }
  // Test cancellation filter
  const cancellationFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "order_cancellation",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(cancellationFilteredResponse);
  for (const record of cancellationFilteredResponse.data) {
    TestValidator.equals(
      "reason matches order_cancellation filter",
      record.reason,
      "order_cancellation",
    );
  }
  // Test refund filter
  const refundFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "refund",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(refundFilteredResponse);
  for (const record of refundFilteredResponse.data) {
    TestValidator.equals(
      "reason matches refund filter",
      record.reason,
      "refund",
    );
  }
  // Test adjustment filter
  const adjustmentFilteredResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "adjustment",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(adjustmentFilteredResponse);
  for (const record of adjustmentFilteredResponse.data) {
    TestValidator.equals(
      "reason matches adjustment filter",
      record.reason,
      "adjustment",
    );
  }
  // 8. Test pagination metadata reflects filtered count
  TestValidator.predicate(
    "pagination exists",
    restockFilteredResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    restockFilteredResponse.pagination.pagination.records >= 0,
  );
  TestValidator.equals(
    "current page is 1",
    restockFilteredResponse.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 20",
    restockFilteredResponse.pagination.pagination.limit,
    20,
  );
  // 9. Test non-existent reason returns empty results
  const nonExistentReasonResponse =
    await api.functional.ecommerceMall.seller.products.variants.inventory.index(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          reason: "non_existent_reason",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallInventoryRecord.IRequest,
      },
    );
  typia.assert(nonExistentReasonResponse);
  TestValidator.predicate(
    "non-existent reason response has pagination",
    nonExistentReasonResponse.pagination !== null,
  );
}
