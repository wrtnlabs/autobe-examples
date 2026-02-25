import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test authorization enforcement when a user attempts to view another user's admin request.
 * A second authenticated user (not the requester and not a super administrator) attempts to
 * access the admin request created by the first user.
 * Validate that: 1) The request is denied with 403 Forbidden status code.
 * 2) The error message indicates insufficient permissions.
 * This validates the authorization boundary case ensuring that admin requests are private
 * between the requester and super administrators only.
 */
export async function test_api_admin_request_view_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create User A's connection and authenticate
  const userAConnection: api.IConnection = { host: connection.host };
  const userA = await authorize_user_join(userAConnection, {});
  typia.assert(userA);
  // 2. User A creates an admin request
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      userAConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Create User B's connection and authenticate (different user)
  const userBConnection: api.IConnection = { host: connection.host };
  const userB = await authorize_user_join(userBConnection, {});
  typia.assert(userB);
  // 4. Verify User A and User B are different users
  TestValidator.notEquals(
    "User A and User B should be different users",
    userA.id,
    userB.id,
  );
  // 5. User B attempts to view User A's admin request - should get 403 Forbidden
  await TestValidator.httpError(
    "User B cannot view User A's admin request",
    403,
    async () =>
      await api.functional.discussionBoard.user.adminRequests.at(
        userBConnection,
        {
          adminRequestId: adminRequest.id,
        },
      ),
  );
}
