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
 * Test seller restocking their product variant with inventory record creation.
 *
 * Validates the complete inventory restock workflow including administrative category setup, seller account approval, product and variant creation, and inventory record creation. Ensures that the inventory record correctly tracks the stock movement and that the variant's stock quantity is properly updated.
 *
 * Special attention is given to verifying that the inventory record is immutable, the quantity_delta is correctly recorded, and the variant's stock_quantity reflects the cumulative sum of all inventory records.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Administrator registers and authenticates account.
 * 3. Seller registers account with approval_status='pending'.
 * 4. Administrator approves seller account (approval_status='approved').
 * 5. Seller authenticates and creates a product under the category.
 * 6. Seller creates a variant for the product with initial stock of 0.
 * 7. Seller creates an inventory record for restocking with quantity_delta=100 and reason='RESTOCK'.
 * 8. Validates inventory record details match input including id, quantity_delta, reason, and created_at.
 * 9. Validates variant stock_quantity is updated to 100 after restock.
 */
export async function test_api_inventory_record_seller_restock_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
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
  // 2. Seller registration (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerJoin);
  TestValidator.equals(
    "seller approval status pending",
    sellerJoin.approval_status,
    "pending",
  );
  // 3. Admin approves seller
  const approvedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerJoin.id,
      body: {
        approval_status: "approved",
      },
    },
  );
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approved",
    approvedSeller.approval_status,
    "approved",
  );
  // 4. Seller login after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerLogin);
  TestValidator.equals(
    "seller login approved",
    sellerLogin.approval_status,
    "approved",
  );
  // 5. Seller creates product
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
  // 6. Seller creates variant with initial stock 0
  const variant = await generate_random_shopping_mall_seller_variants_create(
    sellerLoginConnection,
    {
      body: {
        sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        price: null,
      },
    },
  );
  typia.assert(variant);
  // 7. Seller creates inventory record for restock
  const restockQuantity = 100;
  const restockReason = "RESTOCK";
  const inventoryRecord =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerLoginConnection,
      {
        params: {
          variantId: variant.id,
        },
        body: {
          quantity_delta: restockQuantity,
          reason: restockReason,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Validate inventory record
  TestValidator.equals(
    "quantity_delta matches request",
    inventoryRecord.quantityDelta,
    restockQuantity,
  );
  TestValidator.equals(
    "reason matches request",
    inventoryRecord.reason,
    restockReason,
  );
  TestValidator.equals(
    "productVariant matches variant",
    inventoryRecord.productVariant.id,
    variant.id,
  );
  // 9. Validate variant stock is updated to 100 (initial 0 + restock 100)
  TestValidator.equals(
    "variant stock updated to 100",
    inventoryRecord.productVariant.stock_quantity,
    restockQuantity,
  );
}
