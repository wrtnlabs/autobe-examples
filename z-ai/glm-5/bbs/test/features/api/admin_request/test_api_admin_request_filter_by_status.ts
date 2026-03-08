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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test status filter 'pending'
  const pendingResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all returned requests have status='pending'
  TestValidator.predicate(
    "all pending requests should have status='pending'",
    pendingResult.data.every((request) => request.status === "pending"),
  );
  // 3. Test status filter 'approved'
  const approvedResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned requests have status='approved'
  TestValidator.predicate(
    "all approved requests should have status='approved'",
    approvedResult.data.every((request) => request.status === "approved"),
  );
  // 4. Test status filter 'rejected'
  const rejectedResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      {
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all returned requests have status='rejected'
  TestValidator.predicate(
    "all rejected requests should have status='rejected'",
    rejectedResult.data.every((request) => request.status === "rejected"),
  );
  // 5. Test no status filter - should return requests of all statuses
  const allResult =
    await api.functional.discussionBoard.member.admin_requests.index(
      memberConnection,
      { body: {} as IDiscussionBoardAdminRequest.IRequest },
    );
  typia.assert(allResult);
  // Verify that results can contain any status (no filtering applied)
  TestValidator.predicate(
    "unfiltered results should allow any status",
    allResult.data.every(
      (request) =>
        request.status === "pending" ||
        request.status === "approved" ||
        request.status === "rejected",
    ),
  );
}
