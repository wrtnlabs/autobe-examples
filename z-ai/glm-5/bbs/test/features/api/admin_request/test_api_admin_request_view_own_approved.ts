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
 * Test a user viewing their own administrator request.
 *
 * This test validates the complete workflow where:
 * 1. A user registers and authenticates
 * 2. The user submits an administrator request
 * 3. The user retrieves and views their own request
 * 4. The response structure is validated with all expected fields
 */
export async function test_api_admin_request_view_own_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Create an administrator request
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection,
      {},
    );
  typia.assert(adminRequest);
  // 3. Retrieve the created request by ID
  const retrievedRequest =
    await api.functional.discussionBoard.user.adminRequests.at(userConnection, {
      adminRequestId: adminRequest.id,
    });
  typia.assert(retrievedRequest);
  // 4. Validate the request details
  TestValidator.equals(
    "request ID matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "status is present",
    retrievedRequest.status,
    adminRequest.status,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  // 5. Validate requester information is populated
  TestValidator.equals(
    "requester ID matches user ID",
    retrievedRequest.requester.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "requester email matches user email",
    retrievedRequest.requester.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "requester displayName matches",
    retrievedRequest.requester.displayName,
    authorizedUser.displayName,
  );
  // 6. Validate timestamps are set
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(retrievedRequest.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(retrievedRequest.updated_at).getTime() > 0,
  );
}
