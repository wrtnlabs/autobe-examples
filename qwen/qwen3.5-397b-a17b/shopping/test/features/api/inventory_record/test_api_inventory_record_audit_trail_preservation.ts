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
 * Test that inventory records preserve complete audit trail information including reason codes and timestamps for compliance.
 *
 * Validates the complete inventory record creation flow including administrative category setup, seller authentication, product and variant creation, and inventory record placement. Ensures that the inventory record correctly preserves all audit trail fields including quantity delta, reason codes, and timestamps.
 *
 * Special attention is given to verifying that the quantity_delta is exactly 75 (positive value for stock increase), the reason is preserved exactly as 'ORDER_CANCELLATION' for audit compliance, and the createdAt timestamp is set and immutable. The productVariant relation must include variant details for proper inventory tracking.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Administrator registers and logs in for approval operations.
 * 3. Seller registers account (starts as pending).
 * 4. Administrator approves seller account.
 * 5. Seller logs in and creates a product under the category.
 * 6. Seller creates a variant for the product.
 * 7. Seller creates inventory record with quantity_delta=75 and reason='ORDER_CANCELLATION'.
 * 8. Validates inventory record contains all required audit trail fields with correct values.
 */
export async function test_api_inventory_record_audit_trail_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller registers (starts as pending)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinResult = await authorize_seller_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerJoinResult);
  // 3. Admin approves seller
  await api.functional.shoppingMall.admin.sellers.update(adminConnection, {
    sellerId: sellerJoinResult.id,
    body: {
      approval_status: "approved",
    } satisfies IShoppingMallSeller.IUpdate,
  });
  // 4. Seller logs in with approved account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinResult.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 5. Seller creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates variant
  const variant = await api.functional.shoppingMall.seller.variants.create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        price: null,
      } satisfies IShoppingMallProductVariant.ICreate,
    },
  );
  typia.assert(variant);
  // 7. Seller creates inventory record with specific audit trail data
  const inventoryRecord =
    await api.functional.shoppingMall.seller.variants.inventory_records.create(
      sellerConnection,
      {
        variantId: variant.id,
        body: {
          quantity_delta: 75,
          reason: "ORDER_CANCELLATION",
        } satisfies IShoppingMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 8. Validate audit trail fields
  TestValidator.equals(
    "quantity delta is 75",
    inventoryRecord.quantityDelta,
    75,
  );
  TestValidator.equals(
    "reason is ORDER_CANCELLATION",
    inventoryRecord.reason,
    "ORDER_CANCELLATION",
  );
  TestValidator.predicate(
    "createdAt is set",
    inventoryRecord.createdAt !== null,
  );
  TestValidator.equals(
    "variant sku_code matches",
    inventoryRecord.productVariant.sku_code,
    variant.sku_code,
  );
  TestValidator.equals(
    "variant option_values matches",
    inventoryRecord.productVariant.option_values,
    variant.option_values,
  );
  TestValidator.predicate(
    "stock_quantity is positive",
    inventoryRecord.productVariant.stock_quantity > 0,
  );
}
