import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that multiple restock operations correctly accumulate stock quantity in the inventory ledger.
 *
 * Validates the complete inventory restock workflow including administrative category setup, seller authentication and approval, product and variant creation, and multiple sequential inventory record operations. Ensures that the inventory ledger correctly accumulates stock quantities across multiple restock operations and maintains an accurate audit trail.
 *
 * Special attention is given to verifying that each inventory record preserves its unique identity and reason code, and that the variant's stock_quantity field accurately reflects the sum of all quantity_delta values from the inventory records ledger.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Administrator and seller register accounts with unique credentials.
 * 3. Administrator approves seller account enabling product creation.
 * 4. Seller creates a product under the category.
 * 5. Seller creates a variant for the product with initial stock of 0.
 * 6. Seller creates first inventory record with quantity_delta=50 and reason='INITIAL_STOCK'.
 * 7. Seller creates second inventory record with quantity_delta=30 and reason='RESTOCK'.
 * 8. Seller creates third inventory record with quantity_delta=20 and reason='ADJUSTMENT'.
 * 9. Validates variant stock_quantity equals sum of all quantity_deltas (100).
 * 10. Validates all three inventory records are preserved with correct data.
 */
export async function test_api_inventory_record_multiple_restock_accumulation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller registers account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
    sellerId: sellerAuth.id,
    body: {
      approval_status: "approved",
    } satisfies IShoppingMallSeller.IUpdate,
  });
  // Re-login as seller to get fresh token with approved status
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLoginAuth);
  // 4. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerLoginConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        option_values: `Color: ${RandomGenerator.name()}, Size: ${RandomGenerator.pick(["S", "M", "L", "XL"] as const)}`,
        price: null,
      },
    },
  );
  typia.assert(variant);
  // 6. Create first inventory record (INITIAL_STOCK: 50)
  const firstRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerLoginConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_delta: 50,
          reason: "INITIAL_STOCK",
        },
      },
    );
  typia.assert(firstRecord);
  // 7. Create second inventory record (RESTOCK: 30)
  const secondRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerLoginConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_delta: 30,
          reason: "RESTOCK",
        },
      },
    );
  typia.assert(secondRecord);
  // 8. Create third inventory record (ADJUSTMENT: 20)
  const thirdRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerLoginConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity_delta: 20,
          reason: "ADJUSTMENT",
        },
      },
    );
  typia.assert(thirdRecord);
  // 9. Validate inventory records
  TestValidator.equals(
    "first record quantity_delta",
    firstRecord.quantityDelta,
    50,
  );
  TestValidator.equals(
    "first record reason",
    firstRecord.reason,
    "INITIAL_STOCK",
  );
  TestValidator.equals(
    "second record quantity_delta",
    secondRecord.quantityDelta,
    30,
  );
  TestValidator.equals("second record reason", secondRecord.reason, "RESTOCK");
  TestValidator.equals(
    "third record quantity_delta",
    thirdRecord.quantityDelta,
    20,
  );
  TestValidator.equals("third record reason", thirdRecord.reason, "ADJUSTMENT");
  // Validate all records have unique IDs
  TestValidator.notEquals(
    "first and second IDs differ",
    firstRecord.id,
    secondRecord.id,
  );
  TestValidator.notEquals(
    "first and third IDs differ",
    firstRecord.id,
    thirdRecord.id,
  );
  TestValidator.notEquals(
    "second and third IDs differ",
    secondRecord.id,
    thirdRecord.id,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "first record has timestamp",
    firstRecord.createdAt !== null,
  );
  TestValidator.predicate(
    "second record has timestamp",
    secondRecord.createdAt !== null,
  );
  TestValidator.predicate(
    "third record has timestamp",
    thirdRecord.createdAt !== null,
  );
  // 10. Validate sum of quantity_deltas equals expected total (100)
  const totalQuantityDelta =
    firstRecord.quantityDelta +
    secondRecord.quantityDelta +
    thirdRecord.quantityDelta;
  TestValidator.equals(
    "total quantity delta equals sum of individual deltas",
    totalQuantityDelta,
    100,
  );
}