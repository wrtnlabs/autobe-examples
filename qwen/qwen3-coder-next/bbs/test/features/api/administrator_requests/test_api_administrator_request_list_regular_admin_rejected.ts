import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_list_regular_admin_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a member user who will submit an administrator request
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member submits an administrator request
  await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.content({ paragraphs: 2 }),
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  // 4. Regular admin attempts to access administrator requests list
  // This should be rejected with authorization error
  await TestValidator.error(
    "regular admin should be rejected when accessing requests list",
    async () => {
      await api.functional.discussionBoard.admin.admin.requests.index(
        adminConnection,
        {
          body: {
            status: "pending",
          } satisfies IDiscussionBoardAdministratorRequest.IRequest,
        },
      );
    },
  );
}
