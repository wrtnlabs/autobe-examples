import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
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

export async function test_api_refund_request_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Admin joins the system
  const adminJoinBody = {
    email: RandomGenerator.pick([
      "admin1@example.com",
      "admin2@example.com",
    ] as const),
    password: "TestPass123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Admin logs in
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: undefined,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Seller joins
  const sellerJoinBody = {
    email: RandomGenerator.pick([
      "seller1@example.com",
      "seller2@example.com",
    ] as const),
    password: "SellerPass123!",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);

  // 4. Seller logs in
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: undefined,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 5. Customer joins
  const customerJoinBody = {
    email: RandomGenerator.pick([
      "customer1@example.com",
      "customer2@example.com",
    ] as const),
    password: "CustomerPass123!",
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 6. Customer logs in
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: undefined,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLoggedIn);

  // 7. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 8. Customer creates an order including product SKU
  // Since IShoppingMallOrder.ICreate requires a list of order items with SKU IDs, we will prepare a SKU ID from product's SKUs list if present or skip
  // But no SKU list is present in product DTO, so we create an empty order with required fields since the product's SKU info is not accessible

  // In this limitation, create an order with empty shopping_mall_order_items will cause validation fail
  // Because we have no SKU ID available, so we create a dummy order item with a random UUID assuming SKU is that UUID

  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_product_sku_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    unit_price: 10000,
    total_price: 10000,
  };

  const orderCreateBody: IShoppingMallOrder.ICreate = {
    order_code: `ORDER-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    shipping_address: `${RandomGenerator.mobile()} ${RandomGenerator.name(2)}`,
    shopping_mall_order_items: [orderItem],
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 9. Admin searches refund requests to find an existing refund and link
  const refundRequestSearchBody: IShoppingMallRefundRequest.IRequest = {
    page: 1,
    limit: 5,
    order_code: order.order_code,
  };
  const refundRequestPage: IPageIShoppingMallRefundRequest.ISummary =
    await api.functional.shoppingMall.admin.refundRequests.index(connection, {
      body: refundRequestSearchBody,
    });
  typia.assert(refundRequestPage);

  // Pick a refund request to test detail retrieval
  TestValidator.predicate(
    "exists at least one refund request",
    refundRequestPage.data.length > 0,
  );

  const refundRequestId: string = refundRequestPage.data[0].id;

  // 10. Admin retrieves refund request details by its ID
  const refundRequestDetail: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.admin.refundRequests.at(connection, {
      id: refundRequestId,
    });
  typia.assert(refundRequestDetail);

  // Validate refund amount and refund status are present
  TestValidator.predicate(
    "refund amount is positive",
    refundRequestDetail.refund_amount > 0,
  );
  TestValidator.predicate(
    "refund status is defined",
    refundRequestDetail.refund_status.length > 0,
  );
  TestValidator.equals(
    "refund request id matches",
    refundRequestDetail.id,
    refundRequestId,
  );
  TestValidator.equals(
    "linked order id matches",
    refundRequestDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund customer id matches",
    refundRequestDetail.shopping_mall_customer_id,
    customer.id,
  );
}
