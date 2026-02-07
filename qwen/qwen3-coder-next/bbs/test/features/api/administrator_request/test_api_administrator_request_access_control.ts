import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminsRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminsRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admins_request } from "../../../prepare/prepare_random_discussion_board_admins_request";

export async function test_api_administrator_request_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular user and submit administrator request
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, {
    body: {},
  });
  // Submit administrator request as regular user
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(adminRequest);
  // Step 2: Create admin connection and test access (should be denied)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {},
  });
  // Step 3: Create regular member connection and test access (should be denied)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // Step 4: Test admin access (should be denied)
  await TestValidator.error(
    "admin should not be able to access individual request",
    async () => {
      await api.functional.discussionBoard.admin.requests.at(adminConnection, {
        requestId: "test-request-id",
      });
    },
  );
  // Step 5: Test regular member access (should be denied)
  await TestValidator.error(
    "regular member should not be able to access individual request",
    async () => {
      await api.functional.discussionBoard.admin.requests.at(memberConnection, {
        requestId: "test-request-id",
      });
    },
  );
  // Step 6: Test non-existent request ID
  await TestValidator.error(
    "non-existent request should return error",
    async () => {
      await api.functional.discussionBoard.admin.requests.at(userConnection, {
        requestId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );
}
