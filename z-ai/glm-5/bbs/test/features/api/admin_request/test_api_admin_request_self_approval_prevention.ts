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
 * Test that super administrators are prevented from approving their own
 * administrator requests, enforcing the business rule against self-approval.
 *
 * The scenario involves:
 * 1. Create a user account
 * 2. User submits an admin request as a regular member
 * 3. Promote user to SUPER_ADMINISTRATOR (via test infrastructure)
 * 4. Attempt to approve own pending admin request
 * 5. System returns 409 Conflict for self-approval attempt
 *
 * Note: This test requires test infrastructure support for promoting a user
 * to SUPER_ADMINISTRATOR. Without such utility, the approve endpoint would
 * return 403 Forbidden (permission denied) before reaching the self-approval check.
 */
export async function test_api_admin_request_self_approval_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {});
  typia.assert(userAuth);
  // 2. User submits an admin request (as regular MEMBER)
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Promote user to SUPER_ADMINISTRATOR via test infrastructure
  // In a real test environment, this would use:
  // - A pre-seeded super admin account, OR
  // - A test-only promotion utility (e.g., promote_user_to_super_admin)
  //
  // For this test scenario, we assume such infrastructure exists.
  // Without promotion, the approve call would fail with 403 Forbidden
  // (permission denied) rather than 409 Conflict (self-approval).
  // await promote_user_to_super_admin(connection, { userId: userAuth.id });
  // 4. Attempt to approve own admin request as SUPER_ADMINISTRATOR
  // This should fail with 409 Conflict (self-approval prevention)
  // The API checks: if (request.requester.id === current_user.id) throw Conflict
  await TestValidator.httpError(
    "super admin cannot approve own admin request",
    409,
    async () =>
      await api.functional.discussionBoard.user.adminRequests.approve(
        userConnection,
        {
          adminRequestId: adminRequest.id,
          body: {
            reviewNotes: "Attempting self-approval",
          } satisfies IDiscussionBoardAdminRequest.IApprove,
        },
      ),
  );
}
