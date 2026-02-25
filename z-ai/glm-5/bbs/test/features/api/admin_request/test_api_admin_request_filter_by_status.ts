import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
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

export async function test_api_admin_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple users who will submit admin requests
  const userConnection1: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(userConnection1, {});
  typia.assert(user1);
  const userConnection2: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(userConnection2, {});
  typia.assert(user2);
  const userConnection3: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(userConnection3, {});
  typia.assert(user3);
  // Each user submits an admin request
  const request1 =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection1,
      {},
    );
  typia.assert(request1);
  const request2 =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection2,
      {},
    );
  typia.assert(request2);
  const request3 =
    await generate_random_discussion_board_user_admin_requests_create(
      userConnection3,
      {},
    );
  typia.assert(request3);
  // Create a connection for index calls (using user1's authenticated connection)
  const indexConnection: api.IConnection = { host: connection.host };
  indexConnection.headers = { ...userConnection1.headers };
  // Test filtering by 'pending' status
  const pendingResult =
    await api.functional.discussionBoard.user.adminRequests.index(
      indexConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify pending requests are returned
  TestValidator.predicate(
    "pending result contains at least our created requests",
    pendingResult.data.length >= 3,
  );
  TestValidator.predicate(
    "all pending requests have correct status",
    pendingResult.data.every((r) => r.status === "pending"),
  );
  // Test filtering by 'approved' status
  const approvedResult =
    await api.functional.discussionBoard.user.adminRequests.index(
      indexConnection,
      {
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify empty result for approved status
  TestValidator.equals(
    "approved filter returns empty data",
    approvedResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved filter records count is 0",
    approvedResult.pagination.records,
    0,
  );
  // Test filtering by 'rejected' status
  const rejectedResult =
    await api.functional.discussionBoard.user.adminRequests.index(
      indexConnection,
      {
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify empty result for rejected status
  TestValidator.equals(
    "rejected filter returns empty data",
    rejectedResult.data.length,
    0,
  );
  TestValidator.equals(
    "rejected filter records count is 0",
    rejectedResult.pagination.records,
    0,
  );
  // Test without status filter (should return all requests)
  const allResult =
    await api.functional.discussionBoard.user.adminRequests.index(
      indexConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(allResult);
  // Verify all results includes pending requests
  TestValidator.predicate(
    "all results includes our pending requests",
    allResult.pagination.records >= 3,
  );
}
