import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_platform_oversight_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller A joins and creates product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<1000000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 3. Seller creates variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: {
            color: RandomGenerator.pick(["red", "blue", "green"] as const),
          },
        },
      },
    );
  typia.assert(variant);
  // 4. Seller creates inventory record (stock addition)
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Administrator retrieves the inventory record (cross-seller visibility)
  const adminRetrievedRecord =
    await api.functional.shoppingMall.administrator.variants.inventory_records.at(
      adminConnection,
      {
        variantId: variant.id,
        inventoryRecordId: inventoryRecord.id,
      },
    );
  typia.assert(adminRetrievedRecord);
  // 6. Validate audit trail information
  TestValidator.equals(
    "record id matches",
    adminRetrievedRecord.id,
    inventoryRecord.id,
  );
  TestValidator.equals(
    "variant id matches",
    adminRetrievedRecord.variant.id,
    variant.id,
  );
  TestValidator.equals(
    "quantity change matches",
    adminRetrievedRecord.quantityChange,
    inventoryRecord.quantityChange,
  );
  TestValidator.equals(
    "reason matches",
    adminRetrievedRecord.reason,
    inventoryRecord.reason,
  );
  // 7. Validate variant details in record
  TestValidator.equals(
    "sku code matches",
    adminRetrievedRecord.variant.sku_code,
    variant.skuCode,
  );
  // 8. Validate stock movement direction (positive for addition)
  TestValidator.predicate(
    "quantity change is positive for stock addition",
    adminRetrievedRecord.quantityChange > 0,
  );
  // 9. Validate reason field length (5-500 characters)
  TestValidator.predicate(
    "reason length between 5 and 500",
    adminRetrievedRecord.reason.length >= 5 &&
      adminRetrievedRecord.reason.length <= 500,
  );
  // 10. Validate seller attribution (seller who performed manual adjustment)
  TestValidator.predicate(
    "seller attribution present",
    adminRetrievedRecord.seller !== null,
  );
  TestValidator.equals(
    "seller is the one who created the record",
    adminRetrievedRecord.seller?.id,
    inventoryRecord.seller?.id,
  );
  // 11. Validate timestamp exists
  TestValidator.predicate(
    "created at timestamp exists",
    adminRetrievedRecord.createdAt.length > 0,
  );
  // 12. Validate order/cancellation/refund references are null for manual adjustments
  TestValidator.equals(
    "order reference is null for manual adjustment",
    adminRetrievedRecord.order,
    null,
  );
  TestValidator.equals(
    "cancellation request is null for manual adjustment",
    adminRetrievedRecord.cancellationRequest,
    null,
  );
  TestValidator.equals(
    "refund request is null for manual adjustment",
    adminRetrievedRecord.refundRequest,
    null,
  );
}
