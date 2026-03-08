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

export async function test_api_admin_request_approval_concurrent_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1 = await authorize_admin_join(superAdmin1Connection, {});
  typia.assert(superAdmin1);
  // 2. Create second super administrator
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_admin_join(superAdmin2Connection, {});
  typia.assert(superAdmin2);
  // 3. Create regular member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 4. Create admin request from member
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {},
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request initially pending",
    adminRequest.status,
    "pending",
  );
  // 5. First approval should succeed
  const firstApproval =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdmin1Connection,
      { adminRequestId: adminRequest.id },
    );
  typia.assert(firstApproval);
  TestValidator.equals(
    "first approval status",
    firstApproval.status,
    "approved",
  );
  TestValidator.predicate(
    "first approval has reviewer",
    firstApproval.reviewer !== null,
  );
  // 6. Second approval should fail with 409 Conflict
  await TestValidator.httpError("second approval conflict", 409, async () => {
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdmin2Connection,
      { adminRequestId: adminRequest.id },
    );
  });
}
