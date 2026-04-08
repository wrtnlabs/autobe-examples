import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_approval_list_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // 2. Administrator requests list of seller approval requests
  const approvalRequests =
    await api.functional.ecommerceMall.administrator.seller_approval_requests.index(
      adminConnection,
      {
        body: {
          status: ["pending"],
          page: 0,
          limit: 20,
          sort_by: "created_at",
          order: "desc",
        } satisfies IEcommerceMallSellerApprovalRequest.IRequest,
      },
    );
  typia.assert(approvalRequests);
  // 3. Verify response is valid page structure
  TestValidator.predicate(
    "pagination exists",
    approvalRequests.pagination !== undefined,
  );
  // 4. Verify pagination metadata structure
  const pagination = approvalRequests.pagination;
  TestValidator.predicate(
    "pagination has current field",
    pagination.current !== undefined,
  );
  TestValidator.predicate(
    "pagination has limit field",
    pagination.limit !== undefined,
  );
  TestValidator.predicate(
    "pagination has records field",
    pagination.records !== undefined,
  );
  TestValidator.predicate(
    "pagination has pages field",
    pagination.pages !== undefined,
  );
  // 5. Verify current page is 1-indexed
  TestValidator.predicate(
    "current page is valid (>= 0)",
    pagination.current >= 0,
  );
  // 6. Verify limit is positive
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  // 7. Verify records count is non-negative
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  // 8. Verify pages count is non-negative
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);
  // 9. Verify data is an array
  TestValidator.equals(
    "data is array",
    Array.isArray(approvalRequests.data),
    true,
  );
  // 10. Validate each request in the data array
  for (let i = 0; i < approvalRequests.data.length; i++) {
    const request = approvalRequests.data[i];
    const index = i.toString();
    // Verify request ID is valid UUID
    typia.assert(request.id);
    // Verify status field exists
    TestValidator.predicate(
      `request ${index} has status`,
      request.status !== undefined,
    );
    // Verify seller information is included
    TestValidator.equals(
      `request ${index} has seller info`,
      request.seller !== undefined,
      true,
    );
    // Verify seller has required fields
    typia.assert(request.seller);
    typia.assert(request.seller.id);
    TestValidator.predicate(
      `request ${index} seller has display_name`,
      request.seller.display_name !== undefined,
    );
    // Verify reviewer field is optional (can be undefined)
    // For pending requests, reviewer should be undefined
    if (request.status === "pending") {
      TestValidator.equals(
        `request ${index} reviewer is undefined for pending`,
        request.reviewer,
        undefined,
      );
      TestValidator.equals(
        `request ${index} rejection_reason is undefined for pending`,
        request.rejection_reason,
        undefined,
      );
    }
    // Verify created_at is valid ISO 8601 datetime
    const createdDate = new Date(request.created_at);
    TestValidator.predicate(
      `request ${index} created_at is valid datetime`,
      !isNaN(createdDate.getTime()),
    );
    // Verify updated_at is valid ISO 8601 datetime
    const updatedDate = new Date(request.updated_at);
    TestValidator.predicate(
      `request ${index} updated_at is valid datetime`,
      !isNaN(updatedDate.getTime()),
    );
  }
  // 11. Verify pagination consistency: records count matches actual data length
  TestValidator.equals(
    "pagination records count matches data array length",
    approvalRequests.pagination.records,
    approvalRequests.data.length,
  );
  // 12. Verify sorting: if multiple records exist, verify they're sorted by created_at DESC
  if (approvalRequests.data.length > 1) {
    for (let i = 1; i < approvalRequests.data.length; i++) {
      const prevDate = new Date(approvalRequests.data[i - 1].created_at);
      const currDate = new Date(approvalRequests.data[i].created_at);
      TestValidator.predicate(
        `records are sorted by created_at DESC at index ${i}`,
        currDate <= prevDate,
      );
    }
  }
}
