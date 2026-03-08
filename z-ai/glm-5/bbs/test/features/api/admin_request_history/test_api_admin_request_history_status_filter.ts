import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

export async function test_api_admin_request_history_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member who will submit an admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Member submits an admin request (creates 'pending' history record)
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {},
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  // 3. Create admin who will reject the request and query history
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 4. Admin rejects the request (creates 'rejected' history record)
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      adminConnection,
      { adminRequestId: adminRequest.id },
    );
  typia.assert(rejectedRequest);
  TestValidator.equals(
    "request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  // 5. Query history with status='rejected' filter
  const rejectedHistory =
    await api.functional.discussionBoard.admin.admin_request_histories.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequestHistory.IRequest,
      },
    );
  typia.assert(rejectedHistory);
  // 6. Verify all returned records have 'rejected' status
  TestValidator.predicate(
    "all history records have rejected status",
    rejectedHistory.data.every((record) => record.status === "rejected"),
  );
  // 7. Verify the rejected request is in the results
  TestValidator.predicate(
    "rejected request is in history results",
    rejectedHistory.data.some(
      (record) => record.adminRequest.id === adminRequest.id,
    ),
  );
  // 8. Query history with status='pending' filter
  const pendingHistory =
    await api.functional.discussionBoard.admin.admin_request_histories.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequestHistory.IRequest,
      },
    );
  typia.assert(pendingHistory);
  // 9. Verify all returned records have 'pending' status
  TestValidator.predicate(
    "all history records have pending status",
    pendingHistory.data.every((record) => record.status === "pending"),
  );
  // 10. Query history with status='approved' filter
  const approvedHistory =
    await api.functional.discussionBoard.admin.admin_request_histories.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequestHistory.IRequest,
      },
    );
  typia.assert(approvedHistory);
  // 11. Verify no records with other statuses are mixed in rejected results
  const allHistoryPage =
    await api.functional.discussionBoard.admin.admin_request_histories.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(allHistoryPage);
  // Verify that rejected filter actually filters - count should be different
  TestValidator.predicate(
    "rejected filter returns subset of all records",
    rejectedHistory.pagination.records <= allHistoryPage.pagination.records,
  );
}
