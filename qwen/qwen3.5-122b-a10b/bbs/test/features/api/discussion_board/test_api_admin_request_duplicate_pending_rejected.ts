import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
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
 * Test that a member cannot submit multiple pending administrator requests simultaneously.
 *
 * This test validates the unique constraint on [discussion_board_member_id, status]
 * that prevents duplicate pending requests.
 *
 * Test flow:
 * 1. Authenticate as a member via join
 * 2. Submit the first administrator request with a valid reason - this should succeed
 * 3. Attempt to submit a second administrator request - should fail with 409 Conflict
 */
export async function test_api_admin_request_duplicate_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Submit the first administrator request - should succeed
  const firstRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Validate first request properties
  TestValidator.equals("first request status", firstRequest.status, "pending");
  TestValidator.equals(
    "first request member id",
    firstRequest.member.id,
    memberAuth.id,
  );
  // 3. Attempt to submit a second administrator request - should fail with 409 Conflict
  await TestValidator.httpError(
    "duplicate pending request should be rejected with 409 Conflict",
    409,
    async () => {
      await api.functional.discussionBoard.member.admin_requests.create(
        memberConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    },
  );
}
