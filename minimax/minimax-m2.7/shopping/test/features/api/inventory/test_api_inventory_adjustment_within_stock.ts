import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_inventory_adjustment_within_stock(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for adjusting inventory downward when sufficient stock exists.
  //
  // Steps:
  // 1. Admin creates a category for product assignment
  // 2. Seller authenticates (must be approved seller)
  // 3. Seller creates a product with category
  // 4. Seller creates a product variant with initial stock quantity of 50
  // 5. Seller submits adjustment request with negative quantity (-10 units) and reason 'damaged'
  // 6. Validate response returns inventory record with negative quantity_change
  // 7. Verify variant quantity reduced to 40
  //
  // Validation points:
  // - Adjustment operation accepted when abs(quantity) <= current stock
  // - Inventory record created with negative quantity_change (-10)
  // - Reason 'damaged' stored correctly
  // - Variant stock correctly decreased from 50 to 40
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller" as const,
      requestedGrade: "admin" as const,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Q!W@E#R$T%Y",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller joins and logs in
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
  // Seller must be approved to create products
  // Check if seller is already approved, otherwise this test requires admin approval
  // For E2E test purposes, we proceed assuming seller may be approved or test handles pending state
  // In a real scenario, admin would need to approve seller before product creation
  // 3. Create product with category
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with initial stock of 50
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          quantity: 50 satisfies number & tags.Type<"int32">,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          optionValues: [
            {
              key: "color",
              value: "red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Submit adjustment request with negative quantity (-10) and reason 'damaged'
  const adjustmentQuantity = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const inventoryRecord =
    await api.functional.ecommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity: adjustmentQuantity,
          operationType: "adjustment" as const,
          reason: "damaged",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // 6. Validate inventory record has negative quantity_change
  TestValidator.predicate("inventory record created", inventoryRecord !== null);
  // 7. Verify variant stock decreased from 50 to 40
  // The total stock quantity should reflect the adjustment (50 - 10 = 40)
  TestValidator.equals(
    "total stock quantity reduced by adjustment amount",
    inventoryRecord.totalStockQuantity,
    40,
  );
  // Verify the reason 'damaged' is stored in recent changes
  const hasDamagedReason = inventoryRecord.recentChanges.some(
    (change) => change.reason === "damaged",
  );
  TestValidator.predicate(
    "reason 'damaged' stored correctly in recent changes",
    hasDamagedReason,
  );
  // Verify there is a recent change with negative quantity (-10)
  const hasNegativeChange = inventoryRecord.recentChanges.some(
    (change) => change.quantityChange === -10,
  );
  TestValidator.predicate(
    "inventory record created with negative quantity_change (-10)",
    hasNegativeChange,
  );
  // Verify adjustment operation accepted (stock should not be negative)
  TestValidator.predicate(
    "adjustment operation accepted when abs(quantity) <= current stock",
    inventoryRecord.totalStockQuantity >= 0,
  );
}
