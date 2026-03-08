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

export async function test_api_administrator_request_rejection_without_reason_fails(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member user and submit administrator request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody: IDiscussionBoardMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  };
  await authorize_member_join(memberConnection, { body: memberJoinBody });
  const memberLoginBody: IDiscussionBoardMember.ILogin = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
  };
  await authorize_member_login(memberConnection, { body: memberLoginBody });
  const requestCreateBody: IDiscussionBoardAdministratorRequest.ICreate = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    status: "pending",
  };
  const request = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: requestCreateBody,
    },
  );
  typia.assert(request);
  // Step 2: Login as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinBody: IDiscussionBoardSuperAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminJoinBody,
  });
  const superAdminLoginBody: IDiscussionBoardSuperAdmin.ILogin = {
    email: superAdminJoinBody.email,
    password: superAdminJoinBody.password,
  };
  await authorize_super_admin_login(superAdminConnection, {
    body: superAdminLoginBody,
  });
  // Step 3: Attempt to reject request without rejection_reason (should fail)
  const updateBody: IDiscussionBoardAdministratorRequest.IUpdate = {
    status: "rejected",
    // rejection_reason is intentionally omitted
  };
  // Expected: Validation error when rejecting without reason
  await TestValidator.error(
    "rejection without reason should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.requests.update(
        superAdminConnection,
        {
          requestId: request.id,
          body: updateBody,
        },
      );
    },
  );
}
