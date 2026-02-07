import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admins_request } from "../../../prepare/prepare_random_discussion_board_admins_request";

export async function test_api_admin_request_rejection_empty_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdminConnection);
  // 2. Create regular member connection and submit admin request
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberConnection);
  // 3. Create administrator request
  const request =
    await api.functional.discussionBoard.member.admin.requests.create(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardAdminsRequest.ICreate>(),
      },
    );
  typia.assert(request);
  // 4. Reject request with empty reason
  const rejected =
    await api.functional.discussionBoard.superAdmin.admin.requests.reject(
      superAdminConnection,
      {
        requestId: (request as any).id,
        body: {
          // Empty rejection reason
          reason: "",
        } satisfies IDiscussionBoardAdminsRequest.IReject,
      },
    );
  typia.assert(rejected);
  // 5. Verify rejection
  TestValidator.equals(
    "request status is rejected",
    (rejected as any).status,
    "rejected",
  );
  TestValidator.equals("rejected by super admin", (rejected as any).admin_id, null);
}
