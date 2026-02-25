import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
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
 * Test the banned users list behavior when no users have been banned on the platform.
 *
 * Setup:
 * 1. Create a user and authenticate
 * 2. Submit admin request for the user
 * 3. Approve the admin request to grant administrator privileges
 * 4. Query banned users list and verify empty result
 */
export async function test_api_ban_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Step 2: Submit admin request for the user
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection,
      {},
    );
  typia.assert(adminRequest);
  // Step 3: Approve the admin request (requires super administrator)
  // Use base connection assuming test environment provides super admin context
  const approvedRequest =
    await api.functional.discussionBoard.user.adminRequests.approve(
      connection,
      {
        adminRequestId: adminRequest.id,
        body: { reviewNotes: "Test approval for admin setup" },
      },
    );
  typia.assert(approvedRequest);
  // Step 4: Query banned users list with admin privileges
  const banList = await api.functional.discussionBoard.bans.index(
    userConnection,
    {
      body: {} satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(banList);
  // Step 5: Verify empty result with proper pagination metadata
  TestValidator.equals(
    "current page should be 1",
    banList.pagination.current,
    1,
  );
  TestValidator.equals(
    "records count should be 0",
    banList.pagination.records,
    0,
  );
  TestValidator.equals("pages count should be 0", banList.pagination.pages, 0);
  TestValidator.predicate(
    "data array should be empty",
    banList.data.length === 0,
  );
  TestValidator.predicate(
    "limit should be positive",
    banList.pagination.limit > 0,
  );
}
