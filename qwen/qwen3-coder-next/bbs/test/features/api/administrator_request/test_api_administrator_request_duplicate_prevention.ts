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

export async function test_api_administrator_request_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Step 2: Submit an initial administrator request that gets created successfully
  const initialRequest =
    await api.functional.discussionBoard.member.admin.requests.create(
      memberConnection,
      {
        body: typia.random<IDiscussionBoardAdminsRequest.ICreate>(),
      },
    );
  typia.assert(initialRequest);
  // Step 3: Attempt to submit a second administrator request while the first is still pending
  // Expect a 409 Conflict error for duplicate pending request
  await TestValidator.httpError(
    "duplicate pending request should be rejected with 409 Conflict",
    409,
    async () => {
      await api.functional.discussionBoard.member.admin.requests.create(
        memberConnection,
        {
          body: typia.random<IDiscussionBoardAdminsRequest.ICreate>(),
        },
      );
    },
  );
}
