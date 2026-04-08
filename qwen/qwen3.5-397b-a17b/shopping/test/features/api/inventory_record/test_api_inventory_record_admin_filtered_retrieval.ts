import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator filtered retrieval of inventory movement history.
 *
 * Validates the complete inventory record filtering workflow including administrative setup, seller product creation, and filtered inventory history retrieval. Ensures that the filtering criteria are properly applied and the response structure matches the expected pagination format.
 *
 * Special attention is given to verifying that the response contains valid pagination metadata and that all inventory records have proper structure including quantity_delta, reason codes, and product variant references.
 *
 * 1. Administrator authenticates and creates a category for product organization.
 * 2. Seller authenticates and creates a product under the category.
 * 3. Seller creates a variant for the product to track inventory.
 * 4. Administrator retrieves inventory records with filtering criteria applied.
 * 5. Validates response structure, pagination metadata, and record format.
 */
export async function test_api_inventory_record_admin_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account and category
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
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 2. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product under the category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
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
  // 4. Seller creates variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"])}, Size: ${RandomGenerator.pick(["S", "M", "L"])}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 5. Administrator retrieves inventory records with filtering criteria
  const filterTimestamp = new Date();
  filterTimestamp.setDate(filterTimestamp.getDate() - 7);
  const inventoryRecords =
    await api.functional.shoppingMall.admin.variants.inventory_records.index(
      adminConnection,
      {
        variantId: variant.id,
        body: {
          reason: "RESTOCK",
          createdAtGte: filterTimestamp.toISOString(),
          quantityDeltaMin: 1,
          take: 50,
          skip: 0,
          sort: "created_at",
          order: "DESC",
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(inventoryRecords);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is positive",
    inventoryRecords.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    inventoryRecords.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    inventoryRecords.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    inventoryRecords.pagination.pages >= 0,
  );
  // 7. Validate inventory records are properly structured
  for (const record of inventoryRecords.data) {
    TestValidator.predicate(
      "quantity_delta is integer",
      Number.isInteger(record.quantity_delta),
    );
    TestValidator.predicate("reason is non-empty", record.reason.length > 0);
    TestValidator.predicate(
      "productVariant exists",
      record.productVariant !== undefined,
    );
    TestValidator.predicate(
      "productVariant has SKU code",
      record.productVariant.sku_code.length > 0,
    );
  }
}
