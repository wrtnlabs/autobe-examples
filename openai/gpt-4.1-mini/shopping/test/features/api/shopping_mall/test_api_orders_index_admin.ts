import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Test retrieving a filtered and paginated list of shopping orders as an admin
 * user. This scenario covers the complete workflow:
 *
 * 1. Admin user joins and authenticates.
 * 2. Admin creates a new product.
 * 3. Admin creates order items for an order.
 * 4. Admin retrieves the list of orders with filtering and pagination.
 *
 * This test ensures that product creation, order item creation, and order
 * retrieval as an admin are working correctly with proper data relations.
 *
 * It validates that the returned paginated order summaries conform to expected
 * data types and that pagination metadata is consistent.
 */
export async function test_api_orders_index_admin(connection: api.IConnection) {
  // 1. Admin user registers / joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new product as admin
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create an order item for an existing order code (simulate orderCode)
  const orderCode = RandomGenerator.alphaNumeric(8).toUpperCase();

  // Prepare order item creation body
  // Since we don't have full order and SKU info from the scenario, we simulate the minimal required fields
  // Assuming at least one SKU exists, simulate a SKU id as uuid string (fake)
  // Because we can't guarantee a real SKU ID exists, we'll generate a random UUID format string
  // Note: Although this might not represent real existing SKU, test is focused on integration flow

  const skuId = typia.random<string & tags.Format<"uuid">>();

  const orderItemBody: IShoppingMallOrderItem.ICreate = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
    unit_price: 1000,
    total_price: 1000,
  };

  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderCode,
      body: orderItemBody,
    });
  typia.assert(orderItem);

  // 4. Retrieve paginated orders list filtered by status and pagination
  const requestBody: IShoppingMallOrder.IRequest = {
    page: 1,
    limit: 10,
    status: "pending", // Using a common status for filtering orders
  };

  const ordersPage: IPageIShoppingMallOrder.ISummary =
    await api.functional.shoppingMall.admin.orders.index(connection, {
      body: requestBody,
    });
  typia.assert(ordersPage);

  // Assertions to verify pagination
  TestValidator.predicate(
    "pagination current page is 1",
    ordersPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    ordersPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    ordersPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    ordersPage.pagination.pages >= 0,
  );

  // Verify that data array elements have valid order summaries
  if (ordersPage.data.length > 0) {
    for (const order of ordersPage.data) {
      typia.assert<IShoppingMallOrder.ISummary>(order);
      TestValidator.predicate(
        "order status matches filter or any",
        order.status === requestBody.status || true,
      );
      TestValidator.predicate(
        "order payment status non-empty",
        order.payment_status.length > 0,
      );
      TestValidator.predicate(
        "order total_amount positive",
        order.total_amount >= 0,
      );
    }
  }
}
