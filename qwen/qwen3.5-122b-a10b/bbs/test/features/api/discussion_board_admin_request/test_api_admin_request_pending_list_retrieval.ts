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
 * Test super administrator retrieval of pending admin privilege requests.
 * Validates that:
 * 1. Only super administrators can access this endpoint
 * 2. Response contains only pending requests with correct structure
 * 3. Pagination metadata is correctly returned
 * 4. Reviewer field is null for pending requests
 */
export async function test_api_admin_request_pending_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super" as const,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  TestValidator.equals("super admin grade", superAdmin.grade, "super");
  // 2. Create regular administrator for access denial test
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular" as const,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  TestValidator.equals("regular admin grade", regularAdmin.grade, "regular");
  // 3. Super admin retrieves pending requests list
  const pendingRequest = {
    status: "pending" as const,
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardAdminRequest.IRequest;
  const pendingList =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      superAdminConnection,
      {
        body: pendingRequest,
      },
    );
  typia.assert(pendingList);
  // 4. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    pendingList.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", pendingList.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    pendingList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pendingList.pagination.pages >= 0,
  );
  // 5. Validate each request in the list
  await ArrayUtil.asyncForEach(pendingList.data, async (request) => {
    typia.assert(request);
    // Validate request structure
    TestValidator.predicate("has valid id", request.id.length > 0);
    TestValidator.predicate("has valid status", request.status === "pending");
    TestValidator.predicate("has reason", request.reason.length > 0);
    TestValidator.predicate(
      "has submitted_at",
      request.submitted_at.length > 0,
    );
    // Validate member information
    TestValidator.predicate(
      "member has display_name",
      request.member.display_name.length > 0,
    );
    TestValidator.predicate("member has id", request.member.id.length > 0);
    TestValidator.predicate(
      "member has ban_status",
      request.member.ban_status.length > 0,
    );
    TestValidator.predicate(
      "member has created_at",
      request.member.created_at.length > 0,
    );
    // Validate reviewer is null for pending requests
    TestValidator.equals(
      "reviewer is null for pending",
      request.reviewer,
      null,
    );
  });
  // 6. Validate empty data array case
  TestValidator.predicate("data array exists", Array.isArray(pendingList.data));
  // 7. Test access denial for regular admin (401 or 403)
  await TestValidator.httpError(
    "regular admin denied access",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.admin_requests.pending.index(
        regularAdminConnection,
        {
          body: pendingRequest,
        },
      );
    },
  );
}
