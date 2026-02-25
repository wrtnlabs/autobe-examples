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

/**
 * Test super administrator retrieves paginated list of admin requests.
 *
 * Setup:
 * 1. Create multiple regular users who submit admin requests
 * 2. Authenticate as super admin (requires seeded super admin credentials)
 * 3. Retrieve paginated list and validate structure
 *
 * Note: This test requires a pre-seeded super admin account in the test environment.
 */
export async function test_api_admin_request_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ========================================
  // STEP 1: Create first user and submit admin request
  // ========================================
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {});
  typia.assert(user1);
  const request1 =
    await generate_random_discussion_board_user_admin_requests_create(
      user1Connection,
      {},
    );
  typia.assert(request1);
  // ========================================
  // STEP 2: Create second user and submit admin request
  // ========================================
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {});
  typia.assert(user2);
  const request2 =
    await generate_random_discussion_board_user_admin_requests_create(
      user2Connection,
      {},
    );
  typia.assert(request2);
  // ========================================
  // STEP 3: Authenticate as super admin
  // Note: Requires seeded super admin account with these credentials
  // ========================================
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_user_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // ========================================
  // STEP 4: Retrieve paginated admin requests list
  // ========================================
  const response =
    await api.functional.discussionBoard.user.adminRequests.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // ========================================
  // STEP 5: Validate pagination metadata
  // ========================================
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.predicate("records count", response.pagination.records >= 2);
  TestValidator.predicate("pages count", response.pagination.pages >= 1);
  // ========================================
  // STEP 6: Validate data array contains created requests
  // ========================================
  TestValidator.predicate("data not empty", response.data.length >= 2);
  // Find our created requests in the response
  const foundRequest1 = response.data.find((r) => r.id === request1.id);
  const foundRequest2 = response.data.find((r) => r.id === request2.id);
  TestValidator.predicate(
    "request1 found in list",
    foundRequest1 !== undefined,
  );
  TestValidator.predicate(
    "request2 found in list",
    foundRequest2 !== undefined,
  );
  // ========================================
  // STEP 7: Validate request summary structure
  // ========================================
  const sampleRequest = foundRequest1 ?? response.data[0];
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sampleRequest.id,
    ),
  );
  TestValidator.predicate("has reason", sampleRequest.reason.length >= 50);
  TestValidator.equals("status is pending", sampleRequest.status, "pending");
  TestValidator.equals(
    "review_notes is null for pending",
    sampleRequest.review_notes,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null for pending",
    sampleRequest.reviewed_at,
    null,
  );
  // ========================================
  // STEP 8: Validate requester info is populated
  // ========================================
  TestValidator.predicate(
    "requester has id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sampleRequest.requester.id,
    ),
  );
  TestValidator.predicate(
    "requester has displayName",
    sampleRequest.requester.displayName.length > 0,
  );
  TestValidator.predicate(
    "requester has email",
    sampleRequest.requester.email.includes("@"),
  );
  // ========================================
  // STEP 9: Validate reviewer is null for pending requests
  // ========================================
  TestValidator.equals(
    "reviewer is null for pending",
    sampleRequest.reviewer,
    null,
  );
  // ========================================
  // STEP 10: Validate descending order by created_at
  // ========================================
  if (response.data.length >= 2) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sorted descending at index ${i}`,
        current >= next,
      );
    }
  }
}
