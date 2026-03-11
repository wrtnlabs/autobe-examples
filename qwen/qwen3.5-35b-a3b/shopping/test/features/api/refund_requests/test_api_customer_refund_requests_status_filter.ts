import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_requests_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string &
          tags.Format<"email"> &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string & tags.Format<"uri">,
        referrer: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string & tags.Format<"uri">,
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Create multiple refund requests (all initially 'pending' by API design)
  const refundRequests: IEcommerceMallRefundRequest[] = [];
  // Create 3 refund requests with different order items
  for (let i = 0; i < 3; i++) {
    const orderItemId: string = typia.random<string & tags.Format<"uuid">>();
    const refundRequest: IEcommerceMallRefundRequest =
      await api.functional.ecommerceMall.customer.refund_requests.create(
        customerConnection,
        {
          body: {
            orderItemId: orderItemId,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallRefundRequest.ICreate,
        },
      );
    typia.assert(refundRequest);
    refundRequests.push(refundRequest);
  }
  // 3. Filter by 'pending' status - should return all 3 requests
  const pendingFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "pending",
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  const pendingResponse: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResponse);
  // Verify only pending requests returned
  TestValidator.equals(
    "pending filter - data count",
    pendingResponse.data.length,
    3,
  );
  TestValidator.equals(
    "pending filter - total count",
    pendingResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "pending filter - pages count",
    pendingResponse.pagination.pages,
    1,
  );
  // Verify all returned requests have status 'pending'
  pendingResponse.data.forEach((request, index) => {
    TestValidator.equals(
      `pending filter - request ${index} status`,
      request.request_status,
      "pending",
    );
  });
  // 4. Filter by 'approved' status - should return 0 requests
  const approvedFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "approved",
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  const approvedResponse: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResponse);
  // Verify no approved requests returned
  TestValidator.equals(
    "approved filter - data count",
    approvedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "approved filter - total count",
    approvedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved filter - pages count",
    approvedResponse.pagination.pages,
    0,
  );
  // 5. Filter by 'rejected' status - should return 0 requests
  const rejectedFilter: IEcommerceMallRefundRequest.IRequest = {
    status: "rejected",
    sortBy: "createdAt",
    sortOrder: "desc",
  };
  const rejectedResponse: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResponse);
  // Verify no rejected requests returned
  TestValidator.equals(
    "rejected filter - data count",
    rejectedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "rejected filter - total count",
    rejectedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "rejected filter - pages count",
    rejectedResponse.pagination.pages,
    0,
  );
  // 6. Verify all requests returned when no filter
  const noFilter: IEcommerceMallRefundRequest.IRequest = {};
  const noFilterResponse: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      { body: noFilter },
    );
  typia.assert(noFilterResponse);
  // Verify all 3 requests are returned
  TestValidator.equals(
    "no filter - data count",
    noFilterResponse.data.length,
    3,
  );
  TestValidator.equals(
    "no filter - total count",
    noFilterResponse.pagination.records,
    3,
  );
  // Verify all requests have status 'pending' (default API behavior)
  noFilterResponse.data.forEach((request) => {
    TestValidator.equals(
      "no filter - request status",
      request.request_status,
      "pending",
    );
  });
  // 7. Verify default sort order (created_at DESC) is maintained
  // The last created request should be first
  TestValidator.equals(
    "sort order - latest request first",
    noFilterResponse.data[0].id,
    refundRequests[refundRequests.length - 1].id,
  );
  // Verify created_at values are in descending order
  for (let i = 0; i < noFilterResponse.data.length - 1; i++) {
    const current = noFilterResponse.data[i];
    const next = noFilterResponse.data[i + 1];
    TestValidator.predicate(
      "sort order - created_at descending",
      () => new Date(current.created_at) >= new Date(next.created_at),
    );
  }
  // 8. Verify pagination limits work correctly with filters
  const limitedPendingResponse: IPageIEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          sortBy: "createdAt",
          sortOrder: "desc",
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(limitedPendingResponse);
  // Verify limit is applied
  TestValidator.equals(
    "limit - data count",
    limitedPendingResponse.data.length,
    2,
  );
  TestValidator.equals(
    "limit - total count unchanged",
    limitedPendingResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "limit - page count",
    limitedPendingResponse.pagination.pages,
    2,
  );
}
