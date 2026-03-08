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
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_pending_restriction(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as member to create first connection
  const memberConnection1: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Step 2: Create first administrator request
  const firstRequest =
    await api.functional.discussionBoard.member.requests.create(
      memberConnection1,
      {
        body: {
          reason: "I want to help manage the community",
          status: "pending" as const,
        } satisfies IDiscussionBoardAdministratorRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Verify the first request is created with pending status
  TestValidator.equals("first request status", firstRequest.status, "pending");
  // Step 3: Try to create second administrator request while first is still pending
  await TestValidator.httpError(
    "second request should be rejected",
    400,
    async () => {
      await api.functional.discussionBoard.member.requests.create(
        memberConnection1,
        {
          body: {
            reason: "Another request while first is pending",
            status: "pending" as const,
          } satisfies IDiscussionBoardAdministratorRequest.ICreate,
        },
      );
    },
  );
}
