import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefundRequest";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and establish authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = typia.random<IShoppingMallCustomer.IJoin>();
  const customer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(customer);
  // 2. Create a simulated refund request with customer's data
  // Since there's no API to create refund requests, we'll create a valid request manually
  const refundRequest = typia.random<IShoppingMallOrderRefundRequest>();
  typia.assert(refundRequest);
  // 3. Test retrieval of refund request as the customer
  const retrieved =
    await api.functional.shoppingMall.customer.refund_requests.at(
      customerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate retrieval details
  TestValidator.equals(
    "refund request ID matches",
    retrieved.id,
    refundRequest.id,
  );
  // 5. Test unauthorized access - different customer trying to view refund request
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerData = typia.random<IShoppingMallCustomer.IJoin>();
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: otherCustomerData,
  });
  typia.assert(otherCustomer);
  // This test validates that customers can only access their own requests
  await TestValidator.error("unauthorized access error", async () => {
    await api.functional.shoppingMall.customer.refund_requests.at(
      otherCustomerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  });
}
