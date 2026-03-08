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

export async function test_api_administrator_request_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberUser);
  // 2. Create administrator request with valid reason
  const validReason = RandomGenerator.paragraph({ sentences: 3 });
  const request = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason: validReason,
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request);
  // 3. Validate request response
  TestValidator.equals("request status is pending", request.status, "pending");
  TestValidator.equals("reason matches input", request.reason, validReason);
  TestValidator.predicate(
    "has submitter info",
    request.submitter !== undefined,
  );
  TestValidator.predicate(
    "has submission timestamp",
    request.submitted_at !== undefined,
  );
  // 4. Test edge case: empty reason should be rejected
  await TestValidator.error("empty reason should be rejected", async () => {
    await api.functional.discussionBoard.member.requests.create(
      memberConnection,
      {
        body: {
          reason: "",
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.ICreate,
      },
    );
  });
  // 5. Test edge case: whitespace-only reason should be rejected
  await TestValidator.error(
    "whitespace reason should be rejected",
    async () => {
      await api.functional.discussionBoard.member.requests.create(
        memberConnection,
        {
          body: {
            reason: "   ",
            status: "pending",
          } satisfies IDiscussionBoardAdministratorRequest.ICreate,
        },
      );
    },
  );
}
