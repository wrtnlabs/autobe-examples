import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Login as member to establish session
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: "1234",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 3. Member creates administrator request using utility function
  const request = await generate_random_discussion_board_member_requests_create(
    memberConnection,
    {
      body: {
        reason: "I want to help moderate the community",
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request);
  TestValidator.equals("status is pending", request.status, "pending");
  // 4. Register and login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 5. Login as super admin to establish session
  const superAdminLogin = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: superAdminAuth.email,
        password: "1234",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  // 6. Super admin rejects the request with a reason
  const rejectionReason = "Insufficient experience for administrator role";
  const updatedRequest =
    await api.functional.discussionBoard.superAdmin.requests.update(
      superAdminConnection,
      {
        requestId: request.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IDiscussionBoardAdministratorRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 7. Validate rejection response
  TestValidator.equals("status is rejected", updatedRequest.status, "rejected");
  TestValidator.notEquals(
    "processed_at is set",
    updatedRequest.processed_at,
    null,
  );
  TestValidator.notEquals(
    "processed_by_super_admin is set",
    updatedRequest.processor,
    null,
  );
  TestValidator.equals(
    "rejection_reason matches",
    updatedRequest.rejection_reason,
    rejectionReason,
  );
}