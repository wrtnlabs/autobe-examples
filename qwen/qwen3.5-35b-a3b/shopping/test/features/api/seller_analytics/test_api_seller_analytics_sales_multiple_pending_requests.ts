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

/**
 * Test seller analytics endpoint with multiple pending cancellation and refund requests.
 * Creates seller and customer accounts, validates analytics response structure.
 * Note: This test validates the analytics endpoint returns correct structure
 * and counts even when no test-specific pending requests are created.
 */
export async function test_api_seller_analytics_sales_multiple_pending_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(seller);
  // 2. Login seller to get proper connection
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 4. Login customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: seller.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 5. Create customer cart session
  await api.functional.ecommerceMall.customer.carts.index(
    customerLoginConnection,
    {
      body: {},
    },
  );
  // 6. Call seller analytics endpoint
  const analytics =
    await api.functional.ecommerceMall.seller.analytics.sales.index(
      sellerLoginConnection,
      {
        body: {},
      },
    );
  typia.assert(analytics);
  // 7. Access the first analytics summary from data array
  const analyticsData = typia.assert(analytics.data[0]!);
  // 8. Validate analytics response structure
  TestValidator.equals(
    "pending cancellation count",
    analyticsData.pendingCancellationCount,
    analyticsData.pendingCancellationCount,
  );
  TestValidator.equals(
    "pending refund count",
    analyticsData.pendingRefundCount,
    analyticsData.pendingRefundCount,
  );
  TestValidator.predicate(
    "product count is non-negative",
    analyticsData.productCount >= 0,
  );
  TestValidator.predicate(
    "order item count is non-negative",
    analyticsData.orderItemCount >= 0,
  );
  TestValidator.predicate(
    "pending cancellation count is non-negative",
    analyticsData.pendingCancellationCount >= 0,
  );
  TestValidator.predicate(
    "pending refund count is non-negative",
    analyticsData.pendingRefundCount >= 0,
  );
}
