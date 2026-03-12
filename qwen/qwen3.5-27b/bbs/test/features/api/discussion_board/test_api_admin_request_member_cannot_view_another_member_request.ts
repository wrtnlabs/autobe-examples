import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test that an authenticated member cannot retrieve another member's administrator privilege escalation request.
 * This test enforces authorization boundaries by verifying that Member A cannot access Member B's admin request.
 */
export async function test_api_admin_request_member_cannot_view_another_member_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Submit an administrator request as Member A
  const memberARequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(memberARequest);
  // 3. Register and authenticate as Member B (different account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 4. Submit an administrator request as Member B
  const memberBRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberBConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(memberBRequest);
  // 5. Capture Member B's requestId
  const memberBRequestId = memberBRequest.id;
  // 6. While authenticated as Member A, attempt to access Member B's request
  await TestValidator.httpError(
    "member A cannot view member B's admin request",
    403,
    async () =>
      await api.functional.discussionBoard.member.admin_requests.at(
        memberAConnection,
        {
          requestId: memberBRequestId,
        },
      ),
  );
  // 7. Positive test: Verify Member A can retrieve their own request
  const memberAOwnRequest =
    await api.functional.discussionBoard.member.admin_requests.at(
      memberAConnection,
      {
        requestId: memberARequest.id,
      },
    );
  typia.assert(memberAOwnRequest);
  TestValidator.equals(
    "member A can view own request",
    memberAOwnRequest.id,
    memberARequest.id,
  );
}
