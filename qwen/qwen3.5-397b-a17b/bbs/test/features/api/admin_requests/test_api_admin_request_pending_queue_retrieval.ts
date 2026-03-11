import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test super administrator retrieval of pending administrator request queue.
 *
 * This test validates the complete workflow:
 * 1. Super administrator authentication via admin join
 * 2. Multiple member account creation with admin request submissions
 * 3. Pending queue retrieval with pagination and sorting validation
 * 4. Response structure validation including member information, reason text,
 *    status, timestamps, and pagination metadata
 */
export async function test_api_admin_request_pending_queue_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple member accounts and submit administrator requests
  const memberCount = 3;
  const memberConnections: api.IConnection[] = [];
  const adminRequests: IDiscussionBoardAdminRequest[] = [];
  for (let i = 0; i < memberCount; i++) {
    // Create member account
    const memberConnection: api.IConnection = { host: connection.host };
    const memberAuth = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(memberAuth);
    memberConnections.push(memberConnection);
    // Submit administrator request with unique reason
    const adminRequest =
      await generate_random_discussion_board_member_admin_requests_create(
        memberConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 10,
              wordMax: 15,
            }),
          } satisfies IDiscussionBoardAdminRequest.ICreate,
        },
      );
    typia.assert(adminRequest);
    adminRequests.push(adminRequest);
    // Small delay to ensure different submission timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  // 3. Retrieve pending requests queue (ascending order - oldest first)
  const pendingResultAsc =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResultAsc);
  // 4. Validate response structure and content
  TestValidator.equals(
    "pending requests count matches created",
    pendingResultAsc.data.length,
    memberCount,
  );
  // Validate each pending request has correct business state
  for (let i = 0; i < pendingResultAsc.data.length; i++) {
    const request = pendingResultAsc.data[i];
    // Validate status is pending (business state)
    TestValidator.equals(
      `request ${i} status is pending`,
      request.status,
      "pending",
    );
    // Validate decided_at is null for pending requests (business state)
    TestValidator.equals(
      `request ${i} decided_at is null`,
      request.decided_at,
      null,
    );
    // Validate admin is null for pending requests (business state)
    TestValidator.equals(`request ${i} admin is null`, request.admin, null);
    // Validate member information is present (business logic - member must exist)
    TestValidator.predicate(
      `request ${i} member has display name`,
      request.member.display_name.length > 0,
    );
    // Validate member bio field exists (can be null, but field must be present)
    TestValidator.predicate(
      `request ${i} member bio field exists`,
      "bio" in request.member,
    );
    // Validate submission timestamp is valid ISO date (business logic)
    TestValidator.predicate(
      `request ${i} submitted_at is valid date`,
      !isNaN(new Date(request.submitted_at).getTime()),
    );
  }
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pendingResultAsc.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingResultAsc.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records",
    pendingResultAsc.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "pagination total pages",
    pendingResultAsc.pagination.pages,
    1,
  );
  // 6. Validate sorting order (ascending - oldest first)
  for (let i = 1; i < pendingResultAsc.data.length; i++) {
    const prevTimestamp = new Date(
      pendingResultAsc.data[i - 1].submitted_at,
    ).getTime();
    const currTimestamp = new Date(
      pendingResultAsc.data[i].submitted_at,
    ).getTime();
    TestValidator.predicate(
      `ascending sort order at index ${i}`,
      prevTimestamp <= currTimestamp,
    );
  }
  // 7. Test descending sort order (newest first)
  const pendingResultDesc =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResultDesc);
  // Validate descending order (newest first)
  for (let i = 1; i < pendingResultDesc.data.length; i++) {
    const prevTimestamp = new Date(
      pendingResultDesc.data[i - 1].submitted_at,
    ).getTime();
    const currTimestamp = new Date(
      pendingResultDesc.data[i].submitted_at,
    ).getTime();
    TestValidator.predicate(
      `descending sort order at index ${i}`,
      prevTimestamp >= currTimestamp,
    );
  }
  // 8. Test pagination with different limit
  const pendingResultLimited =
    await api.functional.discussionBoard.admin.admin_requests.pending.index(
      adminConnection,
      {
        body: {
          status: "pending",
          sort: "asc",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(pendingResultLimited);
  TestValidator.equals(
    "pagination with limit 2 returns 2 records",
    pendingResultLimited.data.length,
    2,
  );
  TestValidator.equals(
    "pagination limit is 2",
    pendingResultLimited.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination total records still matches all",
    pendingResultLimited.pagination.records,
    memberCount,
  );
  // Calculate expected pages: ceil(3 / 2) = 2
  TestValidator.equals(
    "pagination total pages with limit 2",
    pendingResultLimited.pagination.pages,
    2,
  );
}
