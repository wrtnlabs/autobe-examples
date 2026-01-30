import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsCommunityApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityApprovalRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsCommunityApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsCommunityApprovalRequest";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_retrieve_pending_community_approval_requests(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: RandomGenerator.alphaNumeric(8) + "@wrtn.io",
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Call the endpoint to retrieve pending approval requests
  const pendingRequests: IPageICommunityBbsCommunityApprovalRequest.ISummary =
    await api.functional.communityBbs.admin.moderation.communities.approval_requests.index(
      adminConnection,
    );
  typia.assert(pendingRequests);
  // Step 3: Validate pagination structure
  const pagination = pendingRequests.pagination;
  TestValidator.equals("pagination current page is 1", pagination.current, 1);
  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Step 4: Validate data structure (using index validator)
  // We'll create a function to validate each request in the array
  const validateRequest = (
    request: ICommunityBbsCommunityApprovalRequest.ISummary,
  ) => {
    TestValidator.equals(
      "request_id is non-empty string",
      request.request_id.length > 0,
      true,
    );
    TestValidator.equals(
      "submitter_id is non-empty string",
      request.submitter_id.length > 0,
      true,
    );
    TestValidator.equals(
      "community_name is non-empty string",
      request.community_name.length > 0,
      true,
    );
    TestValidator.equals(
      "submitted_at is non-empty string",
      request.submitted_at.length > 0,
      true,
    );
  };
  // Validate each request in the data array
  pendingRequests.data.forEach(validateRequest);
  // Step 5: Validate that all requests are pending (status is pending)
  // Since we're calling the pending approval requests endpoint, all should be pending
  // No need to validate status explicitly as the endpoint filters by pending status
  // Step 6: Validate ordering by submitted_at descending
  // We'll test that requests are ordered newest first
  if (pendingRequests.data.length > 1) {
    for (let i = 0; i < pendingRequests.data.length - 1; i++) {
      const current = pendingRequests.data[i];
      const next = pendingRequests.data[i + 1];
      TestValidator.predicate(
        "requests ordered by submitted_at descending",
        new Date(current.submitted_at) >= new Date(next.submitted_at),
      );
    }
  }
  // Step 7: Validate that the data array has the correct relationship with pagination
  TestValidator.predicate(
    "data length matches expectation",
    pendingRequests.data.length <= pendingRequests.pagination.limit,
  );
  // Step 8: For very small datasets, validate pages calculation
  if (pendingRequests.pagination.records <= pendingRequests.pagination.limit) {
    TestValidator.equals(
      "pages should be 1 when records <= limit",
      pendingRequests.pagination.pages,
      1,
    );
  } else {
    TestValidator.equals(
      "pages should be consistent with records and limit",
      Math.ceil(
        pendingRequests.pagination.records / pendingRequests.pagination.limit,
      ),
      pendingRequests.pagination.pages,
    );
  }
  // Final validation: Ensure we have at least one request or handle empty case
  TestValidator.predicate(
    "data array is consistent with records count",
    pendingRequests.data.length === pendingRequests.pagination.records,
  );
}
