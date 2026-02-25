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
 * Test that a non-super-administrator user cannot reject admin requests.
 *
 * This test verifies the permission hierarchy where only SUPER_ADMINISTRATOR
 * can reject admin requests. Regular users and regular administrators are
 * forbidden from performing this operation.
 *
 * Steps:
 * 1. Create a user who submits an admin request
 * 2. Create another user who will attempt the rejection
 * 3. Verify that the rejection attempt returns 403 Forbidden
 */
export async function test_api_admin_request_rejection_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular user who will submit the admin request
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_user_join(requesterConnection, {});
  typia.assert(requester);
  // 2. Create a pending admin request that will be the target of the rejection attempt
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      requesterConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Create another user who will attempt to reject the admin request
  // This user has MEMBER permission level (regular user, not super admin)
  const regularUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(regularUserConnection, {});
  // 4. Verify that the rejection attempt fails with 403 Forbidden
  // Only SUPER_ADMINISTRATOR can reject admin requests
  await TestValidator.httpError(
    "regular user cannot reject admin request",
    403,
    async () => {
      await api.functional.discussionBoard.user.adminRequests.reject(
        regularUserConnection,
        { adminRequestId: adminRequest.id },
      );
    },
  );
}
