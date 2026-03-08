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

export async function test_api_admin_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator for approval
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create regular member who will request admin privileges
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 3. Member creates admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {},
    );
  typia.assert(adminRequest);
  // Validate initial state
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "reviewer is null initially",
    adminRequest.reviewer === null,
  );
  TestValidator.equals(
    "member matches requester",
    adminRequest.member.id,
    member.id,
  );
  // 4. Super admin approves the request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval result
  TestValidator.equals(
    "status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewer exists after approval",
    approvedRequest.reviewer !== null,
  );
  if (approvedRequest.reviewer !== null) {
    TestValidator.equals(
      "reviewer is the approver",
      approvedRequest.reviewer.id,
      superAdmin.id,
    );
  }
  TestValidator.equals(
    "member unchanged",
    approvedRequest.member.id,
    member.id,
  );
  TestValidator.equals(
    "request ID preserved",
    approvedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason preserved",
    approvedRequest.reason,
    adminRequest.reason,
  );
}
