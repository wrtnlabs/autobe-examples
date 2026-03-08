import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_admin_request_update_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection for approval operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create member connection who will submit the admin request
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 3: Member creates a pending admin request
  const request =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {},
    );
  typia.assert(request);
  // Store original reason for reference
  const originalReason = request.reason;
  TestValidator.equals("initial status is pending", request.status, "pending");
  // Step 4: Admin approves the admin request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      adminConnection,
      { adminRequestId: request.id },
    );
  typia.assert(approvedRequest);
  // Step 5: Verify request status is now 'approved'
  TestValidator.equals(
    "request should be approved",
    approvedRequest.status,
    "approved",
  );
  // Step 6: Attempt to update the approved request - should fail with 409 Conflict
  await TestValidator.httpError(
    "update approved request should fail",
    409,
    async () => {
      await api.functional.discussionBoard.admin.admin_requests.update(
        memberConnection,
        {
          adminRequestId: request.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardAdminRequest.IUpdate,
        },
      );
    },
  );
}
