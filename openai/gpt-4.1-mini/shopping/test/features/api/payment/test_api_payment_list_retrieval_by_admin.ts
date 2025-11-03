import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";

/**
 * Test the admin workflow for payment list retrieval with appropriate filters.
 *
 * This test includes the following steps:
 *
 * 1. Admin registration and login to obtain a valid authorization token.
 * 2. Seller registration, login, and product creation for order item linkage.
 * 3. Customer registration and login.
 * 4. Customer creates an order with order items referencing the created product.
 * 5. Admin performs filtered payment list retrievals with paging.
 *
 * The test ensures all API calls respond with appropriate types using
 * typia.assert. Business rules such as filtering by payment status and
 * pagination are verified with TestValidator.
 */
export async function test_api_payment_list_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin login
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin-login.example.com",
        referrer: "https://admin.example.com",
      } satisfies IShoppingMallAdmin.ILogin,
    });
  typia.assert(adminLoggedIn);

  // 3. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = "sellerPwd123";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 4. Seller login
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        ip: null,
        href: "https://seller-login.example.com",
        referrer: "https://seller.example.com",
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(sellerLoggedIn);

  // 5. Seller creates a product
  const productName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const productCode = RandomGenerator.alphaNumeric(12);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: productCode,
        name: productName,
        description: RandomGenerator.content({ paragraphs: 1 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 6. Customer joins
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword = "customerPwd123";
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 7. Customer login
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        ip: null,
        href: "https://customer-login.example.com",
        referrer: "https://customer.example.com",
      } satisfies IShoppingMallCustomer.ILogin,
    });
  typia.assert(customerLoggedIn);

  // 8. Customer creates an order
  const orderCodeRaw = RandomGenerator.alphaNumeric(16).toLowerCase();
  const orderBody: IShoppingMallOrder.ICreate = {
    order_code: orderCodeRaw,
    shipping_address: RandomGenerator.content({ paragraphs: 1 }),
    shopping_mall_order_items: [],
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 9. Add product as order item
  // For simplicity, pick first SKU or skip if no SKU
  const skuId =
    product.shopping_mall_product_skus &&
    product.shopping_mall_product_skus.length > 0
      ? product.shopping_mall_product_skus[0].id
      : null;
  if (skuId === null)
    throw new Error("No SKU available for product for order item.");

  const orderItemBody: IShoppingMallOrderItem.ICreate = {
    shopping_mall_product_sku_id: skuId,
    quantity: 1,
    unit_price: 100000,
    total_price: 100000,
  };
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.customer.orders.items.create(connection, {
      orderCode: order.order_code,
      body: orderItemBody,
    });
  typia.assert(orderItem);

  // 10. Admin retrieves payments list with pagination and filtering
  // First, retrieve without filter
  const paymentsNoFilter: IPageIShoppingMallPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: { page: 1, limit: 20 } satisfies IShoppingMallPayment.IRequest,
    });
  typia.assert(paymentsNoFilter);
  TestValidator.predicate(
    "payments no filter has data array",
    Array.isArray(paymentsNoFilter.data),
  );

  // 11. Retrieve with filtering payment_status='completed'
  const paymentsCompleted: IPageIShoppingMallPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: {
        page: 1,
        limit: 10,
        filter_status: "completed",
        sort_by: "-payment_date",
      } satisfies IShoppingMallPayment.IRequest,
    });
  typia.assert(paymentsCompleted);
  TestValidator.predicate(
    "payments filter completed status items",
    paymentsCompleted.data.every(
      (payment) => payment.payment_status === "completed",
    ),
  );

  // 12. Retrieve with search term using payment method
  const paymentsCreditCard: IPageIShoppingMallPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: {
        page: 1,
        limit: 5,
        search: "credit_card",
      } satisfies IShoppingMallPayment.IRequest,
    });
  typia.assert(paymentsCreditCard);
  TestValidator.predicate(
    "payments search credit_card",
    paymentsCreditCard.data.every((payment) =>
      payment.payment_method.toLowerCase().includes("credit_card"),
    ),
  );
}
