import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequestAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_analytics_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000/",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Query analytics without creating any refund requests
  const analytics =
    await api.functional.ecommerceMall.customer.refund_requests.analytics.getAnalytics(
      customerConnection,
    );
  typia.assert(analytics);
  // 3. Validate all count fields are 0
  TestValidator.equals("total requests is zero", analytics.totalRequests, 0);
  TestValidator.equals("pending count is zero", analytics.pendingCount, 0);
  TestValidator.equals("approved count is zero", analytics.approvedCount, 0);
  TestValidator.equals("rejected count is zero", analytics.rejectedCount, 0);
  TestValidator.equals("refunded count is zero", analytics.refundedCount, 0);
  TestValidator.equals(
    "last 7 days count is zero",
    analytics.last7DaysCount,
    0,
  );
  TestValidator.equals(
    "last 30 days count is zero",
    analytics.last30DaysCount,
    0,
  );
  // 4. Validate rates return 0 when no requests exist
  TestValidator.equals("approval rate is zero", analytics.approvalRate, 0);
  TestValidator.equals("rejection rate is zero", analytics.rejectionRate, 0);
  // 5. Validate average processing time is null when no resolved requests exist
  TestValidator.equals(
    "average processing time is null",
    analytics.averageProcessingTime,
    null,
  );
}
