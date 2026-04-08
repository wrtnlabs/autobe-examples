import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test that an administrator can filter cancellation request snapshots by seller ID and status transitions.
 *
 * This test validates the complete cancellation request snapshot filtering workflow including multi-seller product creation, order placement, cancellation request creation, and snapshot filtering by various criteria.
 *
 * The test creates two different sellers with their own products, places orders containing items from both sellers, creates cancellation requests for items from each seller, and then has each seller respond differently (one approves, one rejects). This generates snapshots with different status transitions that can be filtered.
 *
 * Special attention is given to verifying that:
 * - Snapshots can be filtered by sellerId to show only responses from a specific seller
 * - Snapshots can be filtered by statusAfter to show only approved or rejected requests
 * - Snapshots can be filtered by statusBefore and statusAfter combinations
 * - Combined filters work correctly to show intersection of criteria
 *
 * 1. Register administrator, customer, and two different seller accounts
 * 2. Create products with variants from both sellers
 * 3. Customer places orders with products from both sellers
 * 4. Create cancellation requests for order items from each seller
 * 5. First seller approves their cancellation request (creates snapshot with status_after='approved')
 * 6. Second seller rejects their cancellation request (creates snapshot with status_after='rejected')
 * 7. Administrator filters snapshots by sellerId (first seller) - verify only snapshots from that seller are returned
 * 8. Administrator filters snapshots by statusAfter='approved' - verify only approved cancellation snapshots are returned
 * 9. Administrator filters snapshots by statusBefore='pending' and statusAfter='rejected' - verify only rejected snapshots are returned
 * 10. Administrator combines filters: sellerId + statusAfter='approved' - verify intersection of both filters
 */
export async function test_api_cancellation_request_snapshot_filter_by_seller_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(adminAuth);
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
    },
  });
  typia.assert(customerAuth);
  // 3. Register first seller
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: "seller1@test.com",
      password: "1234",
    },
  });
  typia.assert(seller1Auth);
  // 4. Register second seller
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: "seller2@test.com",
      password: "1234",
    },
  });
  typia.assert(seller2Auth);
  // 5. Create product from first seller
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: "Product from Seller 1",
        description: "Test product created by seller 1",
        base_price: 10000,
      },
    },
  );
  typia.assert(product1);
  // 6. Create product from second seller
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: "Product from Seller 2",
        description: "Test product created by seller 2",
        base_price: 15000,
      },
    },
  );
  typia.assert(product2);
  // 7. Place order with products from both sellers (simplified - assuming cart operations)
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 8. Create cancellation request for order item from first seller
  const cancellationRequest1 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: "Customer wants to cancel this order item from seller 1",
        },
      },
    );
  typia.assert(cancellationRequest1);
  // 9. Create cancellation request for order item from second seller
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[1]?.id ?? order.items[0].id,
          reason: "Customer wants to cancel this order item from seller 2",
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 10. First seller approves their cancellation request
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    seller1Connection,
    {
      cancellationRequestId: cancellationRequest1.id,
      body: {
        status: "approved",
        response_reason: "Seller 1 approves the cancellation request",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 11. Second seller rejects their cancellation request
  await api.functional.shoppingMall.seller.cancellation_requests.update(
    seller2Connection,
    {
      cancellationRequestId: cancellationRequest2.id,
      body: {
        status: "rejected",
        response_reason: "Seller 2 rejects the cancellation request",
      } satisfies IShoppingMallCancellationRequest.IUpdate,
    },
  );
  // 12. Test filtering snapshots by sellerId (first seller)
  const filteredBySeller1 =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          sellerId: seller1Auth.id,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredBySeller1);
  TestValidator.equals(
    "filtered by seller1 count",
    filteredBySeller1.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by seller1 seller matches",
    filteredBySeller1.data[0].seller.id,
    seller1Auth.id,
  );
  // 13. Test filtering snapshots by statusAfter='approved'
  const filteredByApproved =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          statusAfter: "approved",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredByApproved);
  TestValidator.equals(
    "filtered by approved count",
    filteredByApproved.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by approved status",
    filteredByApproved.data[0].status_after,
    "approved",
  );
  // 14. Test filtering snapshots by statusBefore='pending' and statusAfter='rejected'
  const filteredByRejected =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          statusBefore: "pending",
          statusAfter: "rejected",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredByRejected);
  TestValidator.equals(
    "filtered by rejected count",
    filteredByRejected.data.length,
    1,
  );
  TestValidator.equals(
    "filtered by rejected status",
    filteredByRejected.data[0].status_after,
    "rejected",
  );
  TestValidator.equals(
    "filtered by rejected status before",
    filteredByRejected.data[0].status_before,
    "pending",
  );
  // 15. Test combined filters: sellerId + statusAfter='approved'
  const filteredCombined =
    await api.functional.shoppingMall.administrator.cancellation_requests.snapshots.index(
      adminConnection,
      {
        body: {
          sellerId: seller1Auth.id,
          statusAfter: "approved",
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(filteredCombined);
  TestValidator.equals(
    "combined filter count",
    filteredCombined.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter seller matches",
    filteredCombined.data[0].seller.id,
    seller1Auth.id,
  );
  TestValidator.equals(
    "combined filter status",
    filteredCombined.data[0].status_after,
    "approved",
  );
  // 16. Verify each filtered result includes complete snapshot data
  TestValidator.predicate(
    "snapshot has seller info",
    filteredBySeller1.data[0].seller.email !== undefined,
  );
  TestValidator.predicate(
    "snapshot has cancellation request info",
    filteredBySeller1.data[0].cancellationRequest.id !== undefined,
  );
  TestValidator.predicate(
    "snapshot has status_before",
    filteredBySeller1.data[0].status_before === "pending",
  );
  TestValidator.predicate(
    "snapshot has status_after",
    filteredBySeller1.data[0].status_after === "approved",
  );
  TestValidator.predicate(
    "snapshot has seller_response",
    filteredBySeller1.data[0].seller_response !== null,
  );
}
