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
 * Test that attempting to reject an already approved admin request results in a conflict error.
 *
 * Steps:
 * 1. Create a regular user who submits an admin request
 * 2. Create a super administrator and approve the admin request first
 * 3. Attempt to reject the already-approved admin request
 *
 * Validations:
 * - Response should return 409 Conflict status
 * - Error message should indicate the request has already been processed
 */
export async function test_api_admin_request_rejection_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular user who will submit the admin request
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create the admin request using the regular user
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Create a super administrator who will approve the request
  // Note: Super admin account is expected to be seeded in test environment
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(superAdminConnection, {});
  // Note: In actual test environment, this account would be upgraded to SUPER_ADMINISTRATOR
  // 4. Approve the admin request first
  const approvedRequest =
    await api.functional.discussionBoard.user.adminRequests.approve(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          reviewNotes: "Test approval",
        } satisfies IDiscussionBoardAdminRequest.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // Verify the request is now approved
  TestValidator.equals(
    "status should be approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Attempt to reject the already-approved admin request - should fail with 409 Conflict
  await TestValidator.httpError(
    "should return 409 when rejecting already approved request",
    409,
    async () => {
      await api.functional.discussionBoard.user.adminRequests.reject(
        superAdminConnection,
        {
          adminRequestId: adminRequest.id,
        },
      );
    },
  );
}
