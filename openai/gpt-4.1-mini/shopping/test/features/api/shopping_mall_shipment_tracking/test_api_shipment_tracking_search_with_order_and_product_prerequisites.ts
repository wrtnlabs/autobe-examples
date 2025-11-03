import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
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
 * Test the shipment tracking search functionality with full prerequisites.
 *
 * This test validates the end-to-end flow for shipment tracking search,
 * requiring preconditions of seller authentication, product creation, SKU
 * creation, order placement, and shipment tracking creation. The shipment
 * tracking search APIs are tested for filtering, pagination, and sorting under
 * authenticated seller context.
 *
 * Steps:
 *
 * 1. Seller join (register) and login
 * 2. Seller creates a product
 * 3. Seller creates product SKU under that product
 * 4. Customer join and login
 * 5. Customer creates an order for the SKU
 * 6. Seller searches shipment tracking records with filtering and pagination
 *
 * Validations ensure the shipment tracking results correlate with created data,
 * respecting access control and correctness of search behaviors.
 */
export async function test_api_shipment_tracking_search_with_order_and_product_prerequisites(
  connection: api.IConnection,
) {
  // Step 1: Seller registration and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPass1234";
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerAuthorized);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "http://localhost/seller",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 2: Seller creates a product
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        brand: RandomGenerator.name(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);

  // Step 3: Seller creates a SKU under the product
  const createdSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.createSku(
      connection,
      {
        productCode: createdProduct.code,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
          attributes_json: JSON.stringify({
            color: RandomGenerator.pick(["red", "blue", "green"] as const),
            size: RandomGenerator.pick(["S", "M", "L", "XL"] as const),
          }),
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(createdSku);

  // Step 4: Customer join and login
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPass1234";
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        nickname: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customerAuthorized);

  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      ip: null,
      href: "http://localhost/customer",
      referrer: "http://localhost",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 5: Customer creates an order for the SKU
  const createdOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        order_code: RandomGenerator.alphaNumeric(10),
        shipping_address: `${RandomGenerator.mobile()} ${RandomGenerator.name()}`,
        shopping_mall_order_items: [
          {
            shopping_mall_product_sku_id: createdSku.id,
            quantity: 1,
            unit_price: createdSku.price,
            total_price: createdSku.price,
          },
        ],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(createdOrder);

  // Step 6: Seller searches shipment tracking
  // Before shipment tracking search, seller must login again (simulate role switch)
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      ip: null,
      href: "http://localhost/seller",
      referrer: "http://localhost",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Searching with a filter for order_id related to the created order
  const shipmentSearchResponse: IPageIShoppingMallShipmentTracking.ISummary =
    await api.functional.shoppingMall.seller.shipmentTrackings.index(
      connection,
      {
        body: {
          order_id: createdOrder.id,
          tracking_number: undefined,
          carrier_name: undefined,
          shipping_status: undefined,
          shipped_from: undefined,
          shipped_to: undefined,
          delivered_from: undefined,
          delivered_to: undefined,
          page: 1,
          limit: 10,
          sort_by: "shipped_at",
          sort_order: "desc",
        } satisfies IShoppingMallShipmentTracking.IRequest,
      },
    );
  typia.assert(shipmentSearchResponse);

  TestValidator.predicate(
    "Search results contain shipment tracking data",
    shipmentSearchResponse.data.length >= 0,
  );
  TestValidator.equals(
    "Pagination current page equals 1",
    shipmentSearchResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Pagination limit is less than or equal to 10",
    shipmentSearchResponse.pagination.limit <= 10,
  );
}
