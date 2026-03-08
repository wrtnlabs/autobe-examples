import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_super_admin_reject_administrator_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminData = typia.random<IDiscussionBoardSuperAdmin.IJoin>();
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminData,
  });
  typia.assert(superAdminData);
  // 2. Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IDiscussionBoardMember.IJoin>();
  await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(memberData);
  // 3. Member creates administrator request
  const createBody = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status:
      "pending" satisfies IDiscussionBoardAdministratorRequest.ICreate["status"],
  } satisfies IDiscussionBoardAdministratorRequest.ICreate;
  const createdRequest =
    await api.functional.discussionBoard.member.requests.create(
      memberConnection,
      { body: createBody },
    );
  typia.assert(createdRequest);
  // 4. Super admin retrieves pending requests
  const pendingBody = {
    status: "pending",
    sortBy: "submitted_at",
    sortOrder: "desc",
    limit: 10,
  } satisfies IDiscussionBoardAdministratorRequest.IRequest;
  const pendingResult =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      { body: pendingBody },
    );
  typia.assert(pendingResult);
  // 5. Reject the administrator request using the created request's ID directly
  const rejectBody = {
    status:
      "rejected" satisfies IDiscussionBoardAdministratorRequest.IUpdate["status"],
    rejection_reason:
      "Insufficient experience for administrator role" satisfies
        | string
        | null
        | undefined,
  } satisfies IDiscussionBoardAdministratorRequest.IUpdate;
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.requests.reject(
      superAdminConnection,
      {
        requestId: createdRequest.id,
        body: rejectBody,
      },
    );
  typia.assert(rejectedRequest);
  // 6. Validate response
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection_reason matches",
    rejectedRequest.rejection_reason,
    rejectBody.rejection_reason,
  );
  TestValidator.predicate(
    "processed_at is set",
    rejectedRequest.processed_at !== null &&
      rejectedRequest.processed_at !== undefined,
  );
  TestValidator.notEquals("processor is set", rejectedRequest.processor, null);
}