import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";

/**
 * Test updating an existing SKU stock adjustment record as an admin user.
 *
 * This test performs a comprehensive workflow involving multiple user roles:
 *
 * - Admin: joins and logs in to perform update operations with elevated
 *   privileges
 * - Seller: joins, logs in, creates a product, SKU, and initial stock adjustment
 *
 * Workflow steps:
 *
 * 1. Admin user joins and logs in to obtain auth tokens.
 * 2. Seller user joins and logs in.
 * 3. Seller creates a new product.
 * 4. Seller creates a new SKU for the product.
 * 5. Seller creates a stock adjustment associated with the SKU.
 * 6. Admin logs in (again) to switch actor context.
 * 7. Admin updates the stock adjustment record with new values.
 * 8. Validate the updated values are persisted and returned correctly.
 *
 * This test ensures:
 *
 * - Proper multi-actor authentication handling via join/login APIs
 * - Successful creation of dependent product and SKU records
 * - Correct linkage between SKU and stock adjustments
 * - Admin can update stock adjustment records
 * - Correct response payload structure and content
 * - Type safety assertions using typia.assert
 * - Detailed validation using TestValidator assertions
 */
export async function test_api_stock_adjustment_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass1234!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Seller user joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass1234!",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Seller creates a new product
  const productCreateBody = {
    code: `P-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    brand: "TestBrand",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Seller creates a new SKU for the product
  const skuCreateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
    price: 10000,
    attributes_json: JSON.stringify({
      color: RandomGenerator.pick(["red", "green", "blue"] as const),
      size: RandomGenerator.pick(["S", "M", "L"] as const),
    }),
  } satisfies IShoppingMallProductSku.ICreate;

  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: product.code,
        body: skuCreateBody,
      },
    );
  typia.assert(sku);

  // 5. Seller creates a stock adjustment for the SKU
  const stockAdjustmentCreateBody = {
    shopping_mall_product_sku_id: sku.id,
    adjustment_type: "addition",
    quantity: 30,
    actor_type: "seller",
    actor_id: sellerAuthorized.id,
  } satisfies IShoppingMallStockAdjustment.ICreate;

  const stockAdjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.seller.stockAdjustments.create(
      connection,
      {
        body: stockAdjustmentCreateBody,
      },
    );
  typia.assert(stockAdjustment);

  // 6. Admin logs in to switch context for update
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass1234!",
    ip: null,
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 7. Admin updates the stock adjustment record
  const stockAdjustmentUpdateBody = {
    shopping_mall_product_sku_id: sku.id,
    adjustment_type: "subtraction",
    quantity: 10,
    actor_type: "admin",
    actor_id: adminLoggedIn.id,
  } satisfies IShoppingMallStockAdjustment.IUpdate;

  const updatedStockAdjustment: IShoppingMallStockAdjustment =
    await api.functional.shoppingMall.admin.stockAdjustments.update(
      connection,
      {
        id: stockAdjustment.id,
        body: stockAdjustmentUpdateBody,
      },
    );
  typia.assert(updatedStockAdjustment);

  // 8. Validate updated values
  TestValidator.equals(
    "stock adjustment id remains same",
    updatedStockAdjustment.id,
    stockAdjustment.id,
  );
  TestValidator.equals(
    "stock adjustment SKU id",
    updatedStockAdjustment.shopping_mall_product_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "stock adjustment type",
    updatedStockAdjustment.adjustment_type,
    "subtraction",
  );
  TestValidator.equals(
    "stock adjustment quantity",
    updatedStockAdjustment.quantity,
    10,
  );
  TestValidator.equals(
    "stock adjustment actor type",
    updatedStockAdjustment.actor_type,
    "admin",
  );
  TestValidator.equals(
    "stock adjustment actor id",
    updatedStockAdjustment.actor_id,
    adminLoggedIn.id,
  );
}
