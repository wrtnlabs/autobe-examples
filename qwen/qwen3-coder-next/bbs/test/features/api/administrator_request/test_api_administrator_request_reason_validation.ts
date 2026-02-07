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

export async function test_api_administrator_request_reason_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member operations
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register and authenticate a member
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Step 2a: Test with exactly 50 characters (should succeed)
  const reason50 = RandomGenerator.alphabets(50);
  const request50 =
    await api.functional.discussionBoard.member.admin.requests.create(
      memberConnection,
      {
        body: {
          reason: reason50,
        } satisfies IDiscussionBoardAdminsRequest.ICreate,
      },
    );
  typia.assert(request50);
  TestValidator.predicate("50-char reason succeeds", request50 !== null);
  // Step 2b: Test with 49 characters (should fail with validation error)
  const reason49 = RandomGenerator.alphabets(49);
  await TestValidator.error(
    "49-char reason fails with validation error",
    async () => {
      await api.functional.discussionBoard.member.admin.requests.create(
        memberConnection,
        {
          body: {
            reason: reason49,
          } satisfies IDiscussionBoardAdminsRequest.ICreate,
        },
      );
    },
  );
  // Step 2c: Test with 5001 characters (should fail with validation error)
  const reason5001 = RandomGenerator.alphabets(5001);
  await TestValidator.error(
    "5001-char reason fails with validation error",
    async () => {
      await api.functional.discussionBoard.member.admin.requests.create(
        memberConnection,
        {
          body: {
            reason: reason5001,
          } satisfies IDiscussionBoardAdminsRequest.ICreate,
        },
      );
    },
  );
  // Step 2d: Test with exactly 5000 characters (should succeed)
  const reason5000 = RandomGenerator.alphabets(5000);
  const request5000 =
    await api.functional.discussionBoard.member.admin.requests.create(
      memberConnection,
      {
        body: {
          reason: reason5000,
        } satisfies IDiscussionBoardAdminsRequest.ICreate,
      },
    );
  typia.assert(request5000);
  TestValidator.predicate("5000-char reason succeeds", request5000 !== null);
}
