import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test super administrator retrieves pending admin requests list when empty.
 *
 * Validates that when no pending administrator requests exist:
 * 1. Super admin can successfully access the endpoint
 * 2. Response returns empty data array
 * 3. Pagination metadata correctly shows records=0 and pages=0
 * 4. Current page is 1 with valid limit value
 * 5. Response structure follows IPageIDiscussionBoardAdminRequest.ISummary format
 *
 * Note: This test assumes the connection is already authenticated as a super
 * administrator. In a full test suite, a super admin account would be created
 * and authenticated before calling this test function.
 */
export async function test_api_admin_request_pending_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve pending admin requests list (empty scenario)
  // Connection is assumed to be authenticated as super administrator
  const pendingRequests =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 2. Validate response structure for empty result
  TestValidator.equals("data array is empty", pendingRequests.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    pendingRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    pendingRequests.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    pendingRequests.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    pendingRequests.pagination.limit > 0,
  );
}
