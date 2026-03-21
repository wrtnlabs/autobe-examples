import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via POST /ecommerceMall/auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Call PATCH /admin/cancellation-requests with empty body to retrieve all cancellation requests
  const allRequestsResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequestsResponse);
  // 3. Verify response includes pagination metadata
  TestValidator.equals(
    "has pagination metadata",
    allRequestsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has current page",
    typeof allRequestsResponse.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "has limit",
    typeof allRequestsResponse.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "has records count",
    typeof allRequestsResponse.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "has total pages",
    typeof allRequestsResponse.pagination.pages === "number",
    true,
  );
  // 4-7. Verify each cancellation request contains required fields
  for (const request of allRequestsResponse.data) {
    typia.assert(request);
    // Basic fields
    TestValidator.predicate("has id", request.id !== undefined);
    TestValidator.predicate("has reason", request.reason !== undefined);
    TestValidator.predicate("has status", request.status !== undefined);
    TestValidator.predicate("has created_at", request.created_at !== undefined);
    // Customer summary nested
    TestValidator.predicate("has customer", request.customer !== undefined);
    TestValidator.predicate(
      "customer has id",
      request.customer.id !== undefined,
    );
    TestValidator.predicate(
      "customer has email",
      request.customer.email !== undefined,
    );
    // Seller summary nested
    TestValidator.predicate("has seller", request.seller !== undefined);
    TestValidator.predicate("seller has id", request.seller.id !== undefined);
    TestValidator.predicate(
      "seller has email",
      request.seller.email !== undefined,
    );
    // OrderItem summary nested
    TestValidator.predicate("has orderItem", request.orderItem !== undefined);
    TestValidator.predicate(
      "orderItem has id",
      request.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "orderItem has quantity",
      request.orderItem.quantity !== undefined,
    );
    TestValidator.predicate(
      "orderItem has unit_price",
      request.orderItem.unit_price !== undefined,
    );
    TestValidator.predicate(
      "orderItem has status",
      request.orderItem.status !== undefined,
    );
  }
  // 8. Verify results are ordered by created_at descending (newest first)
  if (allRequestsResponse.data.length > 1) {
    for (let i = 0; i < allRequestsResponse.data.length - 1; i++) {
      const current = new Date(
        allRequestsResponse.data[i].created_at,
      ).getTime();
      const next = new Date(
        allRequestsResponse.data[i + 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `item ${i} is newer or same as item ${i + 1}`,
        current >= next,
      );
    }
  }
  // 9. Verify pagination works correctly when limit parameter is set
  const limitedResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          limit: 2,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(limitedResponse);
  TestValidator.equals("limit is 2", limitedResponse.pagination.limit, 2);
  TestValidator.predicate(
    "data length <= limit",
    limitedResponse.data.length <= 2,
  );
  // Verify pagination with specific page
  const pageResponse =
    await api.functional.ecommerceMall.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pageResponse);
  TestValidator.equals("current page is 1", pageResponse.pagination.current, 1);
  TestValidator.equals("limit is 5", pageResponse.pagination.limit, 5);
}
