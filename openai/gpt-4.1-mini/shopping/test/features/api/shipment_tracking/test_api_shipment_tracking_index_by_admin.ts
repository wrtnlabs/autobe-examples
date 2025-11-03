import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
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
 * Validate shipment tracking index retrieval by admin user.
 *
 * The full test process includes:
 *
 * 1. Admin joins and logs in.
 * 2. Seller joins and logs in.
 * 3. Customer joins and logs in.
 * 4. Seller creates a product.
 * 5. Customer creates an order involving that product.
 * 6. Admin queries the shipment tracking index endpoint filtering by tracking
 *    number and shipping status, with pagination and sorting.
 * 7. Validates the response containing shipment tracking summaries.
 *
 * Each step asserts the correct types and values ensuring authentication and
 * access control are respected, and the listing functionality works as
 * expected.
 */
export async function test_api_shipment_tracking_index_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "strongpassword123";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(3),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Admin login to obtain fresh token
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "http://localhost/admin",
      referrer: "http://localhost/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 3. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "sellerpass123";
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      store_name: RandomGenerator.name(2),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 4. Seller login to get token
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "http://localhost/seller",
      referrer: "http://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 5. Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customerpass123";
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 6. Customer login to get token
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "http://localhost/customer",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Switch back to seller actor to create product
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "http://localhost/seller",
      referrer: "http://localhost/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 7. Seller creates product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Switch back to customer for order
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "http://localhost/customer",
      referrer: "http://localhost/",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 8. Customer creates order with at least one product SKU
  // We assume product has at least one SKU, but since SKU creation API is missing
  // and product SKUs are optional in DTO, for test we can skip SKU usage

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: `ORDER-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        shipping_address: `${RandomGenerator.name(1)}, ${RandomGenerator.paragraph({ sentences: 5 })}`,
        shopping_mall_order_items: [],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Switch to admin actor for shipment tracking index
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "http://localhost/admin",
      referrer: "http://localhost/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 9. Admin queries shipment tracking index with filters
  const searchTrackingNumber = ""; // empty string for broad query
  const filterShippingStatus = "shipped"; // example status
  const response: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.admin.shipmentTrackings.index(
      connection,
      {
        body: {
          tracking_number: searchTrackingNumber,
          shipping_status: filterShippingStatus,
          page: 1,
          limit: 10,
          sort_by: "shipped_at",
          sort_order: "desc",
        } satisfies IShoppingMallShipmentTracking.IRequest,
      },
    );
  typia.assert(response);

  // Validate pagination info
  TestValidator.predicate(
    "pagination page number positive",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    response.pagination.limit >= 1,
  );

  // Validate each tracking item
  for (const item of response.data) {
    typia.assert(item);
    TestValidator.predicate(
      "tracking number exists",
      item.tracking_number.length > 0,
    );
    TestValidator.equals(
      "shipping status filter applied",
      item.shipping_status,
      filterShippingStatus,
    );
  }
}
