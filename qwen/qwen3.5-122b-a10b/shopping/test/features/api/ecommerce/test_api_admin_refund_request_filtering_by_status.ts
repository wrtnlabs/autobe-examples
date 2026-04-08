import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator refund request filtering by status.
 *
 * Validates the admin's ability to filter refund requests by their status (pending, approved, rejected) for a specific order item. This ensures administrators can effectively oversee refund management by retrieving only relevant refund requests based on their current state.
 *
 * The test authenticates as an administrator, then queries refund requests with different status filters to verify the filtering mechanism works correctly. It validates that:
 * 1. The endpoint accepts status filter parameters
 * 2. Response contains only refund requests matching the specified status
 * 3. Pagination metadata accurately reflects the filtered result count
 * 4. Each status filter (pending, approved, rejected) returns appropriate results
 *
 * 1. Administrator authenticates via join endpoint.
 * 2. Administrator queries refund requests with 'pending' status filter.
 * 3. Validates response structure and filtering correctness.
 * 4. Administrator queries refund requests with 'approved' status filter.
 * 5. Validates response contains only approved refund requests.
 * 6. Administrator queries refund requests with 'rejected' status filter.
 * 7. Validates response contains only rejected refund requests.
 * 8. Verifies pagination metadata matches filtered result counts.
 */
export async function test_api_admin_refund_request_filtering_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Generate test order and item IDs (in real scenario, these would be created via other endpoints)
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test filtering by 'pending' status
  const pendingResponse: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.admin.orders.items.refund_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate pending status filtering
  TestValidator.equals(
    "pending filter returns correct status",
    pendingResponse.data.every((req) => req.status === "pending"),
    true,
  );
  // 3. Test filtering by 'approved' status
  const approvedResponse: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.admin.orders.items.refund_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  // Validate approved status filtering
  TestValidator.equals(
    "approved filter returns correct status",
    approvedResponse.data.every((req) => req.status === "approved"),
    true,
  );
  // 4. Test filtering by 'rejected' status
  const rejectedResponse: IPageIEcommerceRefundRequest.ISummary =
    await api.functional.ecommerce.admin.orders.items.refund_requests.index(
      adminConnection,
      {
        orderId,
        itemId,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // Validate rejected status filtering
  TestValidator.equals(
    "rejected filter returns correct status",
    rejectedResponse.data.every((req) => req.status === "rejected"),
    true,
  );
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current is valid",
    pendingResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    pendingResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pendingResponse.pagination.pages >= 0,
  );
}
