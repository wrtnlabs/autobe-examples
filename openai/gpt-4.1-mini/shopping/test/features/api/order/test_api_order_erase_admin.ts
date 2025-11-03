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

export async function test_api_order_erase_admin(connection: api.IConnection) {
  // 1. Admin user joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "strong_password1!",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        code: productCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 3. Customer user joins and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer_password1#",
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Place an order by the customer
  // Construct the order with order items linked to the product SKU
  // For simplicity, take first SKU or create synthetic SKU info
  const skuId =
    product.shopping_mall_product_skus?.length &&
    product.shopping_mall_product_skus[0]?.id
      ? product.shopping_mall_product_skus[0].id
      : typia.random<string & tags.Format<"uuid">>();

  // Build order items array with one item referencing the SKU
  const quantity = RandomGenerator.alphaNumeric(1).length; // Use length 1 for quantity 1

  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_product_sku_id: skuId,
      quantity: 1,
      unit_price: product.shopping_mall_product_skus?.[0]?.price ?? 1000,
      total_price: product.shopping_mall_product_skus?.[0]?.price ?? 1000,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  ];

  const orderCode = RandomGenerator.alphaNumeric(12);

  const orderRequest: IShoppingMallOrder.ICreate = {
    order_code: orderCode,
    shipping_address: RandomGenerator.paragraph({ sentences: 1 }),
    shopping_mall_order_items: orderItems,
    shopping_mall_payments: [],
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderRequest,
    });

  typia.assert(order);

  // 5. Admin erases the order by orderCode
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderCode: order.order_code,
  });

  // 6. Verify that trying to retrieve the erased order results in error
  // Since no retrieve function is provided, we trust no error thrown during erase
  // Additional validation for deletion success can be added if API supports it
  // (Skipping due to lack of order retrieval API in materials)
}
