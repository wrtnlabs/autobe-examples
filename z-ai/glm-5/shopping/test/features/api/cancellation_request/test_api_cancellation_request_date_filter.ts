import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request } from "../../../generate/generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_cancellation_request_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create product and variant
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variant);
  // Add inventory
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: { quantity_change: 100, reason: "Initial stock for testing" },
    },
  );
  // 4. Create customers and place orders with cancellation requests
  const customers: IShoppingMallCustomer.IAuthorized[] = [];
  const orders: IShoppingMallOrder[] = [];
  const cancellationRequests: IShoppingMallCancellationRequest[] = [];
  // Create multiple customers with orders and cancellation requests at different times
  for (let i = 0; i < 3; i++) {
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_customer_join(customerConnection, {});
    typia.assert(customerAuth);
    customers.push(customerAuth);
    // Create address
    const address =
      await generate_random_shopping_mall_customer_addresses_create(
        customerConnection,
        { body: {} },
      );
    typia.assert(address);
    // Add to cart
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      { body: { variantId: variant.id, quantity: 1 } },
    );
    // Checkout
    const order = await generate_random_shopping_mall_customer_checkout_create(
      customerConnection,
      { body: { addressId: address.id } },
    );
    typia.assert(order);
    orders.push(order);
    // Add delay between cancellation requests to ensure different timestamps
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    // Create cancellation request for the first order item
    const orderItem = order.orderItems[0];
    const cancellationRequest =
      await generate_random_shopping_mall_customer_customers_orders_items_cancellation_request_request(
        customerConnection,
        {
          params: { orderId: order.id, itemId: orderItem.id },
          body: { reason: `Customer request ${i + 1}: Change of mind` },
        },
      );
    typia.assert(cancellationRequest);
    cancellationRequests.push(cancellationRequest);
  }
  // Store timestamps for filtering
  const firstCreatedAt = cancellationRequests[0].created_at;
  const lastCreatedAt =
    cancellationRequests[cancellationRequests.length - 1].created_at;
  // 5. Seller responds to some requests (setting responded_at)
  // Approve the first cancellation request
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      { cancellationRequestId: cancellationRequests[0].id },
    );
  typia.assert(approvedRequest);
  // The second request will remain pending (no response)
  // The third request - approve it too
  const thirdApprovedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      { cancellationRequestId: cancellationRequests[2].id },
    );
  typia.assert(thirdApprovedRequest);
  // Wait a bit to ensure responded_at is different from created_at
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // 6. Test created_at date range filtering
  const allRequests =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(allRequests);
  // Filter by created_at range
  const createdAtFiltered =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      {
        body: {
          created_at_from: firstCreatedAt,
          created_at_to: new Date().toISOString(),
        },
      },
    );
  typia.assert(createdAtFiltered);
  // Validate all returned requests have createdAt within the range
  TestValidator.predicate(
    "all requests within created_at range",
    createdAtFiltered.data.every(
      (req) =>
        new Date(req.createdAt) >= new Date(firstCreatedAt) &&
        new Date(req.createdAt) <= new Date(),
    ),
  );
  // 7. Test responded_at date range filtering
  const respondedAtFiltered =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      {
        body: {
          responded_at_from: firstCreatedAt,
          responded_at_to: new Date().toISOString(),
        },
      },
    );
  typia.assert(respondedAtFiltered);
  // Validate all returned requests have respondedAt within range and are not pending
  TestValidator.predicate(
    "all requests have respondedAt within range",
    respondedAtFiltered.data.every(
      (req) =>
        req.respondedAt !== null &&
        new Date(req.respondedAt) >= new Date(firstCreatedAt) &&
        new Date(req.respondedAt) <= new Date(),
    ),
  );
  // Validate all returned requests are not pending (status is 'approved' or 'rejected')
  TestValidator.predicate(
    "all requests are not pending",
    respondedAtFiltered.data.every(
      (req) => req.status === "approved" || req.status === "rejected",
    ),
  );
  // 8. Verify pending requests are excluded when responded_at filters are applied
  const pendingRequestExists = respondedAtFiltered.data.some(
    (req) => req.status === "pending" || req.respondedAt === null,
  );
  TestValidator.equals(
    "no pending requests in responded_at filtered results",
    pendingRequestExists,
    false,
  );
  // 9. Test status filter combined with date filter
  const approvedOnlyFiltered =
    await api.functional.shoppingMall.administrator.seller.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          created_at_from: firstCreatedAt,
          created_at_to: new Date().toISOString(),
        },
      },
    );
  typia.assert(approvedOnlyFiltered);
  // Validate all are approved
  TestValidator.predicate(
    "all requests are approved",
    approvedOnlyFiltered.data.every((req) => req.status === "approved"),
  );
  // Validate createdAt is within range
  TestValidator.predicate(
    "approved requests within created_at range",
    approvedOnlyFiltered.data.every(
      (req) =>
        new Date(req.createdAt) >= new Date(firstCreatedAt) &&
        new Date(req.createdAt) <= new Date(),
    ),
  );
}
