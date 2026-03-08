import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller can filter refund requests by status.
 *
 * Validates that sellers can filter refund requests by status (pending, approved, rejected)
 * to manage their refund request workflow efficiently.
 */
export async function test_api_seller_dashboard_filter_refund_requests_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Test filtering by "pending" status
  const pendingResponse =
    await api.functional.ecommerceMall.seller._dashboard.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate response structure
  TestValidator.equals(
    "pending filter - pagination exists",
    pendingResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pending filter - data is array",
    Array.isArray(pendingResponse.data),
    true,
  );
  TestValidator.predicate(
    "pending filter - all items have pending status",
    pendingResponse.data.every((item) => item.status === "pending"),
  );
  // 3. Test filtering by "approved" status
  const approvedResponse =
    await api.functional.ecommerceMall.seller._dashboard.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate response structure
  TestValidator.equals(
    "approved filter - pagination exists",
    approvedResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "approved filter - data is array",
    Array.isArray(approvedResponse.data),
    true,
  );
  TestValidator.predicate(
    "approved filter - all items have approved status",
    approvedResponse.data.every((item) => item.status === "approved"),
  );
  // 4. Test filtering by "rejected" status
  const rejectedResponse =
    await api.functional.ecommerceMall.seller._dashboard.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate response structure
  TestValidator.equals(
    "rejected filter - pagination exists",
    rejectedResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "rejected filter - data is array",
    Array.isArray(rejectedResponse.data),
    true,
  );
  TestValidator.predicate(
    "rejected filter - all items have rejected status",
    rejectedResponse.data.every((item) => item.status === "rejected"),
  );
  // 5. Test filtering with no status (should return all)
  const allResponse =
    await api.functional.ecommerceMall.seller._dashboard.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderItemRefundRequest.IRequest,
      },
    );
  typia.assert(allResponse);
  // Validate response structure
  TestValidator.equals(
    "no filter - pagination exists",
    allResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "no filter - data is array",
    Array.isArray(allResponse.data),
    true,
  );
  TestValidator.predicate(
    "no filter - data has correct structure",
    allResponse.data.every(
      (item) =>
        item.id !== undefined &&
        item.reason !== undefined &&
        item.status !== undefined,
    ),
  );
  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination has current",
    allResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    allResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    allResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    allResponse.pagination.pages >= 0,
  );
}
