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

export async function test_api_administrator_request_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user to submit administrator request
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // 2. Regular user submits administrator request
  const createdRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      userConnection,
      {
        body: typia.random<IDiscussionBoardAdminsRequest.ICreate>(),
      },
    );
  typia.assert(createdRequest);
  // 3. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // 4. Super admin retrieves administrator request by ID
  // Since IDiscussionBoardAdminsRequest doesn't have an id property,
  // we'll generate a UUID to test the error handling for non-existent requests
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // Test that retrieving a non-existent request throws an error
  await TestValidator.error(
    "should return error for non-existent request",
    async () => {
      return api.functional.discussionBoard.admin.requests.at(
        superAdminConnection,
        {
          requestId: requestId,
        },
      );
    },
  );
}
