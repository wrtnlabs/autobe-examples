import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_cancellation_requests_filter_by_status_and_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerJoin);
  // Re-authenticate with the new customer credentials for filtering tests
  const customerAuthConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerAuthConnection, {
    body: customerJoin,
  });
  typia.assert(customerAuth);
  // 2. Test filtering by status='pending'
  const pendingFilterBody: IEcommerceMallCancellationRequest.IRequest = {
    status: "pending",
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const pendingResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerAuthConnection,
      {
        body: pendingFilterBody,
      },
    );
  typia.assert(pendingResponse);
  // 3. Test filtering by status='approved'
  const approvedFilterBody: IEcommerceMallCancellationRequest.IRequest = {
    status: "approved",
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const approvedResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerAuthConnection,
      {
        body: approvedFilterBody,
      },
    );
  typia.assert(approvedResponse);
  // 4. Test filtering by status='rejected'
  const rejectedFilterBody: IEcommerceMallCancellationRequest.IRequest = {
    status: "rejected",
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const rejectedResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerAuthConnection,
      {
        body: rejectedFilterBody,
      },
    );
  typia.assert(rejectedResponse);
  // 5. Test filtering by order_id (using random UUID as no order exists yet)
  const testOrderId = typia.random<string & tags.Format<"uuid">>();
  const orderFilterBody: IEcommerceMallCancellationRequest.IRequest = {
    order_id: testOrderId,
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const orderFilterResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerAuthConnection,
      {
        body: orderFilterBody,
      },
    );
  typia.assert(orderFilterResponse);
  // 6. Test combined filters (status + order_id)
  const combinedFilterBody: IEcommerceMallCancellationRequest.IRequest = {
    status: "pending",
    order_id: testOrderId,
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const combinedFilterResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerAuthConnection,
      {
        body: combinedFilterBody,
      },
    );
  typia.assert(combinedFilterResponse);
  // 7. Test pagination with limit parameter
  const limitFilterBody: IEcommerceMallCancellationRequest.IRequest = {
    limit: 5,
    page: 1,
  } satisfies IEcommerceMallCancellationRequest.IRequest;
  const limitFilterResponse: IPageIEcommerceMallCancellationRequest.ISummary =
    await api.functional.ecommerceMall.member.cancellation_requests.index(
      customerAuthConnection,
      {
        body: limitFilterBody,
      },
    );
  typia.assert(limitFilterResponse);
  // Validate filtering functionality
  // Status filter validation
  TestValidator.equals(
    "status=pending filter - response structure valid",
    pendingResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "status=pending filter - pagination present",
    pendingResponse.pagination !== undefined,
    true,
  );
  // Status filter validation
  TestValidator.equals(
    "status=approved filter - response structure valid",
    approvedResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "status=approved filter - pagination present",
    approvedResponse.pagination !== undefined,
    true,
  );
  // Status filter validation
  TestValidator.equals(
    "status=rejected filter - response structure valid",
    rejectedResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "status=rejected filter - pagination present",
    rejectedResponse.pagination !== undefined,
    true,
  );
  // Order ID filter validation
  TestValidator.equals(
    "order_id filter - response structure valid",
    orderFilterResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "order_id filter - pagination present",
    orderFilterResponse.pagination !== undefined,
    true,
  );
  // Combined filter validation
  TestValidator.equals(
    "combined filter - response structure valid",
    combinedFilterResponse.data !== undefined,
    true,
  );
  TestValidator.equals(
    "combined filter - pagination present",
    combinedFilterResponse.pagination !== undefined,
    true,
  );
  // Validate pagination metadata accuracy
  TestValidator.equals(
    "pending pagination - current page is 1",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending pagination - limit is 10",
    pendingResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pending pagination - records matches data length",
    pendingResponse.pagination.records,
    pendingResponse.data.length,
  );
  TestValidator.equals(
    "pending pagination - pages calculation is correct",
    pendingResponse.pagination.pages,
    Math.ceil(
      pendingResponse.pagination.records / pendingResponse.pagination.limit,
    ),
  );
  // Validate limit parameter is respected
  TestValidator.equals(
    "limit filter - pagination limit is 5",
    limitFilterResponse.pagination.limit,
    5,
  );
  // Validate response fields when data exists
  if (pendingResponse.data.length > 0) {
    const firstRequest = pendingResponse.data[0];
    typia.assert(firstRequest);
    TestValidator.equals(
      "pending filter - first item has id",
      firstRequest.id !== undefined,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has reason",
      firstRequest.reason !== undefined && firstRequest.reason !== null,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has status",
      firstRequest.status !== undefined && firstRequest.status !== null,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has created_at",
      firstRequest.created_at !== undefined && firstRequest.created_at !== null,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has updated_at",
      firstRequest.updated_at !== undefined && firstRequest.updated_at !== null,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has item",
      firstRequest.item !== undefined && firstRequest.item !== null,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has order",
      firstRequest.order !== undefined && firstRequest.order !== null,
      true,
    );
    TestValidator.equals(
      "pending filter - first item has seller",
      firstRequest.seller !== undefined && firstRequest.seller !== null,
      true,
    );
  }
}
