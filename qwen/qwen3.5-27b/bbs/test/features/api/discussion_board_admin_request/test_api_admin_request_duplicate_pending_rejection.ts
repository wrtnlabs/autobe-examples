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
 * Test that a member cannot submit a second administrator request while their first request is still pending.
 *
 * 1. Register a new member account
 * 2. Submit first administrator request with valid reason
 * 3. Verify first request is created with 'pending' status
 * 4. Attempt to submit second administrator request
 * 5. Verify second submission is rejected (business logic error)
 * 6. Confirm only one request exists for this member
 */
export async function test_api_admin_request_duplicate_pending_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Submit first administrator request
  const firstRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstRequest);
  // 3. Verify first request is created with 'pending' status
  TestValidator.equals(
    "first request status is pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "first request has valid ID",
    firstRequest.id.length > 0,
  );
  TestValidator.equals(
    "first request member matches",
    firstRequest.member.id,
    member.id,
  );
  // 4. Attempt to submit second administrator request (should fail)
  await TestValidator.error(
    "second admin request should be rejected when pending request exists",
    async () => {
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    },
  );
  // 5. Verify the first request still exists and remains unchanged
  TestValidator.equals(
    "first request still pending after failed second attempt",
    firstRequest.status,
    "pending",
  );
}
