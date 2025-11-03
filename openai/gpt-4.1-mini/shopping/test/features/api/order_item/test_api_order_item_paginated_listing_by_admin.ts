import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
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

export async function test_api_order_item_paginated_listing_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration (join) and login
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongPassword123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "StrongPassword123!",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Seller user registration (join) and login
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123$",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(seller);
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerPass123$",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Create a product by the seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph(),
    brand: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 4. Create SKU for the product explicitly
  // Note: The scenario mentions product SKU creation, but no explicit API given for SKU creation,
  // we assume it's part of product creation or not separately exposed. For this test, we mock SKU id.
  // We must use a realistic SKU id for the order item: Generate a UUID-based SKU id
  const productSkuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Customer user registration (join) and login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPass456#",
    nickname: RandomGenerator.name(2),
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass456#",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 6. Create customer order associating the SKU
  const orderCreateBody = {
    order_code: `OC-${RandomGenerator.alphaNumeric(8)}`,
    shipping_address: `${RandomGenerator.name(1)} street, City X, Country Y`,
    shopping_mall_order_items: [
      {
        shopping_mall_product_sku_id: productSkuId,
        quantity: 2,
        unit_price: 100,
        total_price: 200,
      },
    ],
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreateBody,
    });
  typia.assert(order);

  // 7. Query for paginated order items as admin for the created order
  const { order_code } = order;

  // Valid query with pagination, sorting ascending by quantity
  const paginatedResult1 =
    await api.functional.shoppingMall.admin.orders.items.index(connection, {
      orderCode: order_code,
      body: {
        page: 1,
        limit: 10,
        sort_by: "quantity",
        order: "asc",
        shopping_mall_order_id: order.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(paginatedResult1);
  TestValidator.predicate(
    "Paginated result has data array",
    Array.isArray(paginatedResult1.data),
  );
  TestValidator.equals(
    "Pagination current page",
    paginatedResult1.pagination.current,
    1,
  );

  // Valid query with pagination, sorting descending by total_price
  const paginatedResult2 =
    await api.functional.shoppingMall.admin.orders.items.index(connection, {
      orderCode: order_code,
      body: {
        page: 1,
        limit: 5,
        sort_by: "total_price",
        order: "desc",
        shopping_mall_order_id: order.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(paginatedResult2);
  TestValidator.equals(
    "Pagination limit equals 5",
    paginatedResult2.pagination.limit,
    5,
  );

  // Query with filter_status omitted because no information on valid filter status values
  const paginatedResult3 =
    await api.functional.shoppingMall.admin.orders.items.index(connection, {
      orderCode: order_code,
      body: {
        page: 1,
        shopping_mall_order_id: order.id,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(paginatedResult3);

  // Check data consistency
  if (
    Array.isArray(paginatedResult3.data) &&
    paginatedResult3.data.length > 0
  ) {
    const sampleItem = paginatedResult3.data[0];
    TestValidator.predicate(
      "Sample order item has valid quantity",
      sampleItem.quantity > 0,
    );
    TestValidator.predicate(
      "Sample order item has non-empty sku_code",
      typeof sampleItem.product_sku.sku_code === "string" &&
        sampleItem.product_sku.sku_code.length > 0,
    );
  }
}
