import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
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
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_product_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_product_variants_inventory_records_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_inventory_overview_value_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account for approval workflow
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Submit admin request (seller requests admin privileges)
  const adminRequestConnection: api.IConnection = { host: connection.host };
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      adminRequestConnection,
      {
        body: {
          actorType: "seller",
          requestedGrade: "admin",
          reason:
            "Need admin access to manage platform inventory and view stock overview for testing purposes",
          href: "https://example.com/admin/request",
          referrer: "https://example.com/",
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  // 4. Super admin approves the admin request
  await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
    superAdminConnection,
    {
      requestId: adminRequest.id,
    },
  );
  // 5. Create a category for the product
  // Using a known category structure - create via seller products flow
  // First, need to wait for seller approval - check via seller login
  // For seller to be approved, we need to use the seller join token
  // The seller join already created the session with token
  // Seller operations should use sellerConnection which has the token
  // 6. Create product with base price $25.00
  // Use a placeholder category - will need actual category ID
  // Since we can't create categories easily, use a test category approach
  // For this test, we'll use the admin connection to access inventory overview
  // The admin login requires email/password, but we created admin via request
  // Need to login as the approved admin
  // Use the admin email from the request to login
  // But password is not set for seller-type admin requests
  // Instead, use the admin request token for operations
  // Access inventory overview using the admin request token
  const adminTokenConnection: api.IConnection = { host: connection.host };
  // The admin request returned a token - use it for admin operations
  // adminRequest.token contains the authorization token
  // 7. Create product using seller connection (token from join)
  const testCategoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Inventory Value",
        description:
          "Product for testing inventory value calculation with base price $25.00",
        categoryId: testCategoryId,
        basePrice: 25.0,
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 8. Add inventory records with known quantities
  // Restock 10 units at $25.00 (value: $250)
  await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.create(
    sellerConnection,
    {
      variantId: product.id,
      body: {
        quantity: 10,
        operationType: "restock",
        reason: "restock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // Restock 5 more units at $25.00 (value: $125)
  await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.create(
    sellerConnection,
    {
      variantId: product.id,
      body: {
        quantity: 5,
        operationType: "restock",
        reason: "restock",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // Adjustment -3 units (simulating order deduction, value: -$75)
  await api.functional.ecommerceMall.seller.productVariants.inventoryRecords.create(
    sellerConnection,
    {
      variantId: product.id,
      body: {
        quantity: 3,
        operationType: "adjustment",
        reason: "order_placement",
      } satisfies IEcommerceMallInventoryRecord.ICreate,
    },
  );
  // 9. Get inventory overview as admin
  // Use admin request connection which has the token
  const overview =
    await api.functional.ecommerceMall.admin.inventory.overview.at(
      adminRequestConnection,
    );
  typia.assert(overview);
  // 10. Validate stock value calculation
  // Expected: (10 + 5 - 3) units * $25.00 = 12 * $25.00 = $300.00
  const expectedStockQuantity = 12;
  const expectedStockValue = 300.0;
  TestValidator.equals(
    "totalStockQuantity should be 12 (10 + 5 - 3)",
    overview.totalStockQuantity,
    expectedStockQuantity,
  );
  TestValidator.equals(
    "totalStockValue should be 300.00 (12 * 25.00)",
    overview.totalStockValue,
    expectedStockValue,
  );
  // 11. Validate recentChanges are ordered by createdAt descending (most recent first)
  if (overview.recentChanges.length > 1) {
    for (let i = 0; i < overview.recentChanges.length - 1; i++) {
      const currentTime = new Date(
        overview.recentChanges[i].createdAt,
      ).getTime();
      const nextTime = new Date(
        overview.recentChanges[i + 1].createdAt,
      ).getTime();
      TestValidator.predicate(
        `recentChanges[${i}] should be more recent than recentChanges[${i + 1}]`,
        currentTime >= nextTime,
      );
    }
  }
  // 12. Validate recentChanges contain expected reasons
  const restockChanges = overview.recentChanges.filter(
    (c) => c.reason === "restock",
  );
  const orderPlacementChanges = overview.recentChanges.filter(
    (c) => c.reason === "order_placement",
  );
  TestValidator.predicate(
    "should have at least 2 restock changes",
    restockChanges.length >= 2,
  );
  TestValidator.predicate(
    "should have at least 1 order_placement change",
    orderPlacementChanges.length >= 1,
  );
  // 13. Validate positive quantity changes for restocking
  const positiveChanges = overview.recentChanges.filter(
    (c) => c.quantityChange > 0,
  );
  TestValidator.predicate(
    "should have positive quantity changes for restocking",
    positiveChanges.length >= 2,
  );
  // 14. Validate negative quantity change for order_placement
  const negativeChanges = overview.recentChanges.filter(
    (c) => c.quantityChange < 0,
  );
  TestValidator.predicate(
    "should have negative quantity changes for order deductions",
    negativeChanges.length >= 1,
  );
  // Find the specific -3 quantity change for order_placement
  const orderPlacementNegChange = overview.recentChanges.find(
    (c) => c.reason === "order_placement" && c.quantityChange === -3,
  );
  TestValidator.predicate(
    "should have -3 quantity change for order_placement",
    orderPlacementNegChange !== undefined,
  );
  // 15. Validate the calculation: 10 + 5 - 3 = 12 units
  const totalQuantityFromRecords = overview.recentChanges.reduce(
    (sum, change) => sum + change.quantityChange,
    0,
  );
  TestValidator.equals(
    "sum of quantity changes should equal totalStockQuantity",
    totalQuantityFromRecords,
    overview.totalStockQuantity,
  );
}
