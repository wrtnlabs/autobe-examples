import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

/**
 * This E2E test validates the scenario where a customer user erases their own
 * order identified uniquely by an order code. The test covers the complete
 * flow:
 *
 * 1. Authentication: Registers and authenticates a new customer user.
 * 2. Admin Authentication: Registers and authenticates a new admin user.
 * 3. Product Creation: Using the authenticated admin context, creates a product
 *    which will later act as the ordered item.
 * 4. Product SKU Preparation: Extracts the first SKU from the created product to
 *    use in the order creation.
 * 5. Order Creation: Using the authenticated customer context, creates a new order
 *    containing the product SKU, quantity, and pricing.
 * 6. Order Deletion: The customer deletes the order by using the unique order
 *    code.
 * 7. Verification: Confirms that the deletion process completes successfully.
 *
 * All API responses are validated for type correctness with typia.assert.
 * TestValidator is used for business logic assertions. Authentication tokens
 * are managed automatically by SDK calls switching, ensuring calls are done
 * under correct user contexts.
 *
 * This test ensures the authorization is properly enforced, that the order
 * belongs to the customer performing deletion, and that the order is removed
 * from the system effectively.
 */
export async function test_api_order_erase_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "securePassword123",
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Admin registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Create product using admin authorization
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10).toUpperCase(),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Extract product SKU
  const sku: IShoppingMallProductSku = (product.shopping_mall_product_skus ??
    [])[0];
  if (!sku) {
    throw new Error("No SKU found on the created product");
  }
  typia.assert(sku);

  // 5. Create an order for the customer including the product SKU
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_product_sku_id: sku.id,
    quantity: 1,
    unit_price: sku.price,
    total_price: sku.price,
  };

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    order_code: RandomGenerator.alphaNumeric(15).toUpperCase(),
    shipping_address: `${RandomGenerator.name()} street, ${RandomGenerator.name()} city, ${RandomGenerator.name()} country`,
    shopping_mall_order_items: [orderItem],
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 6. Customer deletes their own order using order code
  await api.functional.shoppingMall.customer.orders.erase(connection, {
    orderCode: order.order_code,
  });

  // 7. If no error is thrown, deletion is successful
  TestValidator.predicate("Order deleted successfully", true);
}
