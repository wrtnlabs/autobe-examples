import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryStock } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryStock";
import type { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSaleVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantAttribute";
import type { IShoppingMallSaleVariantValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleVariantValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate inventory transaction details provide complete audit trail
 * information.
 *
 * This test ensures that when sellers perform manual inventory adjustments, the
 * system captures complete audit trail information including seller context and
 * accurate quantity tracking. The test validates that administrators can access
 * detailed transaction records for compliance and auditing purposes.
 *
 * Workflow:
 *
 * 1. Admin authenticates to enable category creation and audit access
 * 2. Seller authenticates to perform inventory operations
 * 3. Admin creates category for product organization
 * 4. Seller creates product sale with full details
 * 5. Seller defines variant attributes and values for SKU configuration
 * 6. Seller creates specific SKU with variant combination
 * 7. Seller initializes inventory stock for the SKU
 * 8. Seller performs manual inventory adjustment
 * 9. Seller searches transactions to locate the adjustment transaction
 * 10. Admin retrieves transaction details to verify complete audit trail
 * 11. Validate all audit fields including seller context and quantities
 */
export async function test_api_inventory_transaction_detail_audit_trail(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Seller authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.content({ paragraphs: 1 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 3: Admin creates category
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        display_order: 1,
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 4: Seller creates product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale: IShoppingMallSale =
    await api.functional.shoppingMall.seller.sales.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 14,
      } satisfies IShoppingMallSale.ICreate,
    });
  typia.assert(sale);

  // Step 5: Create variant attribute
  const variantAttribute: IShoppingMallSaleVariantAttribute =
    await api.functional.shoppingMall.seller.sales.variantAttributes.create(
      connection,
      {
        saleCode: sale.code,
        body: {
          name: "Size",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantAttribute.ICreate,
      },
    );
  typia.assert(variantAttribute);

  // Step 6: Create variant value
  const variantValue: IShoppingMallSaleVariantValue =
    await api.functional.shoppingMall.seller.sales.variantAttributes.values.create(
      connection,
      {
        saleCode: sale.code,
        variantAttributeId: variantAttribute.id,
        body: {
          value: "Medium",
          display_order: 0,
        } satisfies IShoppingMallSaleVariantValue.ICreate,
      },
    );
  typia.assert(variantValue);

  // Step 7: Create SKU
  const sku: IShoppingMallSaleSku =
    await api.functional.shoppingMall.seller.sales.skus.create(connection, {
      saleCode: sale.code,
      body: {
        sku_code: RandomGenerator.alphaNumeric(10),
        variant_combination: JSON.stringify({ Size: "Medium" }),
        base_price: 10000,
        enabled: true,
      } satisfies IShoppingMallSaleSku.ICreate,
    });
  typia.assert(sku);

  // Step 8: Initialize inventory stock
  const initialQuantity = 100;
  const inventoryStock: IShoppingMallInventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.create(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: initialQuantity,
        } satisfies IShoppingMallInventoryStock.ICreate,
      },
    );
  typia.assert(inventoryStock);

  // Step 9: Perform manual inventory adjustment
  const adjustmentQuantity = 120;
  const updatedStock: IShoppingMallInventoryStock =
    await api.functional.shoppingMall.seller.saleSkus.inventoryStock.update(
      connection,
      {
        saleSkuId: sku.id,
        body: {
          total_quantity: adjustmentQuantity,
        } satisfies IShoppingMallInventoryStock.IUpdate,
      },
    );
  typia.assert(updatedStock);

  // Step 10: Search for transactions related to this SKU
  const transactionPage: IPageIShoppingMallInventoryTransaction.ISummary =
    await api.functional.shoppingMall.seller.inventoryTransactions.index(
      connection,
      {
        body: {
          shopping_mall_sale_sku_id: sku.id,
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryTransaction.IRequest,
      },
    );
  typia.assert(transactionPage);

  // Verify transactions were found
  TestValidator.predicate(
    "inventory transactions should exist for the SKU",
    transactionPage.data.length > 0,
  );

  // Find the adjustment transaction by quantity change
  const expectedQuantityChange = adjustmentQuantity - initialQuantity;
  const adjustmentTransaction = transactionPage.data.find(
    (t) => t.quantity_change === expectedQuantityChange,
  );
  typia.assertGuard(adjustmentTransaction!);

  // Step 11: Admin retrieves complete transaction details
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  const transactionDetail: IShoppingMallInventoryTransaction =
    await api.functional.shoppingMall.admin.inventoryTransactions.at(
      connection,
      {
        transactionId: adjustmentTransaction.id,
      },
    );
  typia.assert(transactionDetail);

  // Step 12: Validate complete audit trail information

  // Verify seller context is captured
  TestValidator.predicate(
    "transaction should have seller_id populated for seller-initiated transaction",
    transactionDetail.shopping_mall_seller_id !== null &&
      transactionDetail.shopping_mall_seller_id !== undefined,
  );

  // Verify seller relationship includes summary information
  TestValidator.predicate(
    "transaction should include seller summary information",
    transactionDetail.seller !== null && transactionDetail.seller !== undefined,
  );

  if (transactionDetail.seller) {
    const sellerSummary = transactionDetail.seller;
    TestValidator.equals(
      "seller summary should contain correct seller ID",
      sellerSummary.id,
      seller.id,
    );
    TestValidator.equals(
      "seller summary should contain correct store name",
      sellerSummary.store_name,
      seller.store_name,
    );
    TestValidator.equals(
      "seller summary should contain correct email",
      sellerSummary.email,
      seller.email,
    );
  }

  // Verify quantity audit fields are accurate
  TestValidator.equals(
    "previous quantity should match initial stock level",
    transactionDetail.previous_quantity,
    initialQuantity,
  );

  TestValidator.equals(
    "new quantity should match adjusted stock level",
    transactionDetail.new_quantity,
    adjustmentQuantity,
  );

  TestValidator.equals(
    "quantity change should reflect the adjustment delta",
    transactionDetail.quantity_change,
    expectedQuantityChange,
  );

  // Verify SKU relationship
  TestValidator.equals(
    "transaction should reference correct SKU",
    transactionDetail.shopping_mall_sale_sku_id,
    sku.id,
  );

  // Verify created_at timestamp exists and is valid
  TestValidator.predicate(
    "transaction should have creation timestamp for audit trail",
    transactionDetail.created_at !== null &&
      transactionDetail.created_at !== undefined &&
      transactionDetail.created_at.length > 0,
  );

  // Verify the transaction provides complete traceability
  TestValidator.predicate(
    "transaction should provide complete audit trail with all required fields",
    transactionDetail.id !== null &&
      transactionDetail.shopping_mall_sale_sku_id !== null &&
      transactionDetail.transaction_type !== null &&
      transactionDetail.quantity_change !== 0 &&
      transactionDetail.previous_quantity >= 0 &&
      transactionDetail.new_quantity >= 0,
  );
}
