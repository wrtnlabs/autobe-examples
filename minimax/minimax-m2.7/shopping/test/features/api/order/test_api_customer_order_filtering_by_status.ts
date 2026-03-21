import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer filtering orders by status.
 *
 * This test verifies that the PATCH /ecommerceMall/customer/orders endpoint
 * correctly filters orders based on the status parameter.
 *
 * Steps:
 * 1. Authenticate as customer via POST /auth/customer/join
 * 2. Call PATCH /ecommerceMall/customer/orders with various status filters
 * 3. Validate response returns correct pagination structure
 * 4. Test filtering by 'delivered', 'cancelled', 'paid', 'shipped' statuses
 */
export async function test_api_customer_order_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(authorized);
  customerConnection.headers!.Authorization = `Bearer ${authorized.token.access}`;
  // Step 2: Test filtering by 'delivered' status
  const deliveredOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(deliveredOrders);
  TestValidator.equals(
    "pagination exists",
    deliveredOrders.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data is array",
    Array.isArray(deliveredOrders.data),
    true,
  );
  for (const order of deliveredOrders.data) {
    TestValidator.equals(
      "order status is delivered",
      order.status,
      "delivered",
    );
  }
  // Step 3: Test filtering by 'cancelled' status
  const cancelledOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "cancelled",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(cancelledOrders);
  TestValidator.equals(
    "pagination exists for cancelled",
    cancelledOrders.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data is array for cancelled",
    Array.isArray(cancelledOrders.data),
    true,
  );
  for (const order of cancelledOrders.data) {
    TestValidator.equals(
      "order status is cancelled",
      order.status,
      "cancelled",
    );
  }
  // Step 4: Test filtering by 'paid' status
  const paidOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  TestValidator.equals(
    "pagination exists for paid",
    paidOrders.pagination !== null,
    true,
  );
  for (const order of paidOrders.data) {
    TestValidator.equals("order status is paid", order.status, "paid");
  }
  // Step 5: Test filtering by 'shipped' status
  const shippedOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "shipped",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(shippedOrders);
  TestValidator.equals(
    "pagination exists for shipped",
    shippedOrders.pagination !== null,
    true,
  );
  for (const order of shippedOrders.data) {
    TestValidator.equals("order status is shipped", order.status, "shipped");
  }
  // Step 6: Test filtering by 'refunded' status
  const refundedOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "refunded",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(refundedOrders);
  TestValidator.equals(
    "pagination exists for refunded",
    refundedOrders.pagination !== null,
    true,
  );
  for (const order of refundedOrders.data) {
    TestValidator.equals("order status is refunded", order.status, "refunded");
  }
  // Step 7: Test filtering by 'partially_completed' status
  const partiallyCompletedOrders =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "partially_completed",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(partiallyCompletedOrders);
  TestValidator.equals(
    "pagination exists for partially_completed",
    partiallyCompletedOrders.pagination !== null,
    true,
  );
  for (const order of partiallyCompletedOrders.data) {
    TestValidator.equals(
      "order status is partially_completed",
      order.status,
      "partially_completed",
    );
  }
  // Step 8: Test without status filter (should return all orders)
  const allOrders = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(allOrders);
  TestValidator.equals(
    "pagination exists for all orders",
    allOrders.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data is array for all orders",
    Array.isArray(allOrders.data),
    true,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allOrders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allOrders.pagination.pages >= 0,
  );
}
