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
 * Test a user viewing their own pending administrator request.
 *
 * This test validates the primary success path for requesters checking
 * their submitted admin request status. It covers:
 * 1. User authentication and admin request creation
 * 2. Retrieval of the pending request
 * 3. Validation that the response contains correct details
 * 4. Verification that requester matches authenticated user
 * 5. Confirmation that reviewer-related fields are null for pending status
 */
export async function test_api_admin_request_view_own_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Create a pending admin request
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Retrieve the admin request by ID
  const retrieved = await api.functional.discussionBoard.user.adminRequests.at(
    userConnection,
    {
      adminRequestId: adminRequest.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate response contains complete admin request details
  TestValidator.equals("id matches", retrieved.id, adminRequest.id);
  TestValidator.equals("reason matches", retrieved.reason, adminRequest.reason);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.predicate(
    "created_at is valid",
    new Date(retrieved.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid",
    new Date(retrieved.updated_at).getTime() > 0,
  );
  // 5. Validate requester matches authenticated user
  TestValidator.equals(
    "requester id matches user id",
    retrieved.requester.id,
    authorized.id,
  );
  TestValidator.equals(
    "requester displayName matches",
    retrieved.requester.displayName,
    authorized.displayName,
  );
  TestValidator.equals(
    "requester email matches",
    retrieved.requester.email,
    authorized.email,
  );
  // 6. Validate reviewer fields are null for pending request
  TestValidator.equals("reviewer is null", retrieved.reviewer, null);
  TestValidator.equals("reviewed_at is null", retrieved.reviewed_at, null);
  TestValidator.equals("review_notes is null", retrieved.review_notes, null);
}
