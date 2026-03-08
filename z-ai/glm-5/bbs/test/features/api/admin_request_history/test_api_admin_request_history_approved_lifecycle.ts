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

export async function test_api_admin_request_history_approved_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create admin connection (super admin for approval)
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Member submits admin request - creates 'pending' history record
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {},
    );
  typia.assert(adminRequest);
  // Admin approves the request - creates 'approved' history record
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      adminConnection,
      { adminRequestId: adminRequest.id },
    );
  typia.assert(approvedRequest);
  // Query history to get all records for this admin request
  const historyPage =
    await api.functional.discussionBoard.admin.admin_request_histories.index(
      adminConnection,
      {
        body: {
          discussion_board_admin_request_id: adminRequest.id,
        } satisfies IDiscussionBoardAdminRequestHistory.IRequest,
      },
    );
  typia.assert(historyPage);
  // Validate pagination
  TestValidator.equals("history record count", historyPage.data.length, 2);
  // Find pending and approved history records
  const pendingRecord = historyPage.data.find((h) => h.status === "pending");
  const approvedRecord = historyPage.data.find((h) => h.status === "approved");
  // Validate pending record exists with null reviewer
  TestValidator.predicate("pending record exists", pendingRecord !== undefined);
  TestValidator.equals(
    "pending reviewer is null",
    pendingRecord!.reviewer,
    null,
  );
  TestValidator.equals("pending status", pendingRecord!.status, "pending");
  TestValidator.equals(
    "pending admin request matches",
    pendingRecord!.adminRequest.id,
    adminRequest.id,
  );
  // Validate approved record exists with reviewer info
  TestValidator.predicate(
    "approved record exists",
    approvedRecord !== undefined,
  );
  TestValidator.predicate(
    "approved reviewer exists",
    approvedRecord!.reviewer !== null,
  );
  TestValidator.equals("approved status", approvedRecord!.status, "approved");
  TestValidator.equals(
    "approved admin request matches",
    approvedRecord!.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reviewer matches admin",
    approvedRecord!.reviewer!.id,
    admin.id,
  );
  // Validate chronological order: pending created before approved
  TestValidator.predicate(
    "pending created before approved",
    new Date(pendingRecord!.created_at) < new Date(approvedRecord!.created_at),
  );
}
