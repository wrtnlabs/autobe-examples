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
 * Test the successful rejection of a pending administrator request by a super administrator.
 *
 * Workflow:
 * 1. Create a regular user who submits an admin request
 * 2. Create a second user to act as the super admin reviewer
 * 3. Super admin rejects the pending admin request
 * 4. Verify the rejection was processed correctly
 */
export async function test_api_admin_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular user who will submit the admin request
  const requesterConnection: api.IConnection = { host: connection.host };
  const requester = await authorize_user_join(requesterConnection, {});
  typia.assert(requester);
  // Step 2: Create an admin request from the regular user
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      requesterConnection,
      {},
    );
  typia.assert(adminRequest);
  // Verify initial state is pending
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "requester matches",
    adminRequest.requester.id,
    requester.id,
  );
  // Step 3: Create a second user to act as the super admin reviewer
  const reviewerConnection: api.IConnection = { host: connection.host };
  const reviewer = await authorize_user_join(reviewerConnection, {});
  typia.assert(reviewer);
  // Step 4: Reject the admin request
  const rejectedRequest =
    await api.functional.discussionBoard.user.adminRequests.reject(
      reviewerConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  // Step 5: Validate the rejection response
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "requester unchanged",
    rejectedRequest.requester.id,
    requester.id,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    rejectedRequest.reviewed_at !== null,
  );
  TestValidator.predicate("reviewer is set", rejectedRequest.reviewer !== null);
  TestValidator.equals(
    "reviewer matches",
    rejectedRequest.reviewer!.id,
    reviewer.id,
  );
  TestValidator.equals(
    "admin request id unchanged",
    rejectedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason unchanged",
    rejectedRequest.reason,
    adminRequest.reason,
  );
}
