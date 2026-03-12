import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member who has never submitted admin requests receives an empty but valid paginated response.
 *
 * Setup:
 * 1. Register a new member account
 * 2. Do NOT submit any admin requests
 *
 * Test Steps:
 * 1. Authenticate as the member
 * 2. Call PATCH /discussionBoard/member/admin-requests with default parameters
 * 3. Verify response structure is valid (contains pagination and data fields)
 * 4. Verify data array is empty
 * 5. Verify pagination.records = 0
 * 6. Verify pagination.pages = 0
 * 7. Verify pagination.current = 1 (default page)
 * 8. Verify pagination.limit = 20 (default limit)
 */
export async function test_api_admin_request_member_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Call admin-requests endpoint with default parameters (empty request body)
  const response =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Verify response structure is valid
  TestValidator.predicate(
    "has pagination field",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data field", response.data !== undefined);
  // 4. Verify data array is empty
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 5. Verify pagination.records = 0
  TestValidator.equals(
    "pagination records is 0",
    response.pagination.records,
    0,
  );
  // 6. Verify pagination.pages = 0
  TestValidator.equals("pagination pages is 0", response.pagination.pages, 0);
  // 7. Verify pagination.current = 1 (default page)
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  // 8. Verify pagination.limit = 20 (default limit)
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
}
