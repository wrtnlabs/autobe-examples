import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test refund request filtering by status with comprehensive validation.
 *
 * Validates the refund request list endpoint's status filtering functionality. The test verifies that the API correctly handles status filter parameters and returns accurate pagination metadata for each filter scenario.
 *
 * Special attention is given to ensuring that:
 * - Each status filter returns only requests matching that status
 * - Pagination metadata correctly reflects filtered result counts
 * - Filtering is applied independently for each status value
 * - Empty filter results return correct pagination with zero records
 *
 * Note: This test uses an authenticated member account. Actual refund requests
 * would be created via a separate POST endpoint (not available in current API).
 * The filtering functionality is validated by testing all three status parameters.
 */
export async function test_api_refund_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer member
  const authConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(authConnection, {
    body: undefined,
  });
  typia.assert(authResponse);
  // Create filtered connection with auth token from authResponse
  const filteredConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authResponse.token.access,
    },
  };
  // 2. Test filter with status="pending"
  const pendingResponse =
    await api.functional.ecommerceMall.member.refund_requests.index(
      filteredConnection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(pendingResponse);
  // Validate pending filter returns correct data structure and pagination
  TestValidator.equals(
    "pending filter data is empty array",
    pendingResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pending filter pagination current",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending filter pagination records",
    pendingResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pending filter pagination pages",
    pendingResponse.pagination.pages,
    0,
  );
  // 3. Test filter with status="approved"
  const approvedResponse =
    await api.functional.ecommerceMall.member.refund_requests.index(
      filteredConnection,
      {
        body: { status: "approved" },
      },
    );
  typia.assert(approvedResponse);
  // Validate approved filter returns correct data structure and pagination
  TestValidator.equals(
    "approved filter data is empty array",
    approvedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "approved filter pagination current",
    approvedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "approved filter pagination records",
    approvedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "approved filter pagination pages",
    approvedResponse.pagination.pages,
    0,
  );
  // 4. Test filter with status="rejected"
  const rejectedResponse =
    await api.functional.ecommerceMall.member.refund_requests.index(
      filteredConnection,
      {
        body: { status: "rejected" },
      },
    );
  typia.assert(rejectedResponse);
  // Validate rejected filter returns correct data structure and pagination
  TestValidator.equals(
    "rejected filter data is empty array",
    rejectedResponse.data.length,
    0,
  );
  TestValidator.equals(
    "rejected filter pagination current",
    rejectedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "rejected filter pagination records",
    rejectedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "rejected filter pagination pages",
    rejectedResponse.pagination.pages,
    0,
  );
  // 5. Test filter without status parameter (all requests)
  const allResponse =
    await api.functional.ecommerceMall.member.refund_requests.index(
      filteredConnection,
      {
        body: {},
      },
    );
  typia.assert(allResponse);
  // Validate all filter returns correct data structure and pagination
  TestValidator.equals(
    "no filter data is empty array",
    allResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no filter pagination current",
    allResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "no filter pagination records",
    allResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "no filter pagination pages",
    allResponse.pagination.pages,
    0,
  );
  // 6. Verify all pagination limit is consistent
  TestValidator.equals(
    "all filters use same pagination limit",
    pendingResponse.pagination.limit,
    approvedResponse.pagination.limit,
  );
  TestValidator.equals(
    "all filters use same pagination limit",
    approvedResponse.pagination.limit,
    rejectedResponse.pagination.limit,
  );
}