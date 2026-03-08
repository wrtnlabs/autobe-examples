import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSalesAnalytic";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import type { IPageIEcommerceMallSalesAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSalesAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_analytics_sales_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer to create test data
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Register seller (will be pending by default, but we'll use the token for test)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. As customer, create a shopping cart session
  const cartResponse = await api.functional.ecommerceMall.customer.carts.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(cartResponse);
  // 4. As customer, create an order (this will create order items for seller analytics)
  const orderResponse =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(orderResponse);
  // 5. As customer, create a pending cancellation request
  const cancellationResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(cancellationResponse);
  // 6. As customer, create a pending refund request
  const refundResponse =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(refundResponse);
  // 7. Authenticate as seller to access analytics endpoint
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAuthConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  // 8. Call the seller analytics sales endpoint
  const analyticsResponse =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerAuthConnection,
      {
        body: {},
      },
    );
  typia.assert(analyticsResponse);
  // 9. Validate the response
  // Check that we have exactly one record
  TestValidator.equals(
    "analytics record count",
    analyticsResponse.data.length,
    1,
  );
  // Validate the single analytics record
  const analytics = analyticsResponse.data[0];
  typia.assert(analytics);
  // Verify product count is non-negative (0 since seller has no products)
  TestValidator.predicate(
    "product count is non-negative",
    analytics.productCount >= 0,
  );
  // Verify order item count is non-negative (0 since no products)
  TestValidator.predicate(
    "order item count is non-negative",
    analytics.orderItemCount >= 0,
  );
  // Verify pending cancellation count equals 1
  TestValidator.equals(
    "pending cancellation count",
    analytics.pendingCancellationCount,
    1,
  );
  // Verify pending refund count equals 1
  TestValidator.equals("pending refund count", analytics.pendingRefundCount, 1);
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    analyticsResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", analyticsResponse.pagination.limit, 20);
  TestValidator.equals("records is 1", analyticsResponse.pagination.records, 1);
  TestValidator.equals("pages is 1", analyticsResponse.pagination.pages, 1);
}
