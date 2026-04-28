import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a customer can filter their refund requests by processing status.
 *
 * Validates that the customer refund request search endpoint correctly filters results based on the status parameter. The test registers a new customer, then queries refund requests using three different status values to ensure each filter returns only matching records.
 *
 * 1. Customer joins the platform and authenticates.
 * 2. Filter refund requests with status 'pending' and verify all results have pending status.
 * 3. Filter refund requests with status 'approved' and verify all results have approved status.
 * 4. Filter refund requests with status 'rejected' and verify all results have rejected status.
 */
export async function test_api_refund_request_filter_by_status(
  connection: api.IConnection,
) {
  // 1. Authenticate a customer by joining the platform
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 2. Filter refund requests with status 'pending'
  const pendingConnection: api.IConnection = {
    host: customerConnection.host,
    headers: customerConnection.headers,
  };
  const pendingRequests =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      pendingConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommercePlatformRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  TestValidator.predicate(
    "pending filter returns only pending requests",
    pendingRequests.data.every((request) => request.status === "pending"),
  );
  // 3. Filter refund requests with status 'approved'
  const approvedConnection: api.IConnection = {
    host: customerConnection.host,
    headers: customerConnection.headers,
  };
  const approvedRequests =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      approvedConnection,
      {
        body: {
          status: "approved",
        } satisfies IEcommercePlatformRefundRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  TestValidator.predicate(
    "approved filter returns only approved requests",
    approvedRequests.data.every((request) => request.status === "approved"),
  );
  // 4. Filter refund requests with status 'rejected'
  const rejectedConnection: api.IConnection = {
    host: customerConnection.host,
    headers: customerConnection.headers,
  };
  const rejectedRequests =
    await api.functional.ecommercePlatform.customer.refund_requests.index(
      rejectedConnection,
      {
        body: {
          status: "rejected",
        } satisfies IEcommercePlatformRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  TestValidator.predicate(
    "rejected filter returns only rejected requests",
    rejectedRequests.data.every((request) => request.status === "rejected"),
  );
}
