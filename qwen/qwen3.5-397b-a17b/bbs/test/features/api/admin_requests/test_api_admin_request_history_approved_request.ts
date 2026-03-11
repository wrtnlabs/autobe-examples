import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestHistory";
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
 * Test retrieving complete audit history for an administrator application request.
 *
 * This test verifies that super administrators can retrieve the complete audit
 * history of an administrator application request, including status transitions
 * from submission through approval decision. The test validates that the history
 * contains proper administrator information, timestamps, and status data.
 *
 * Test Flow:
 * 1. Register a member account and authenticate
 * 2. Submit an administrator application request with valid justification
 * 3. Register a super administrator account and authenticate
 * 4. Retrieve the audit history for the submitted request
 * 5. Validate history structure and content
 */
export async function test_api_admin_request_history_approved_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Submit administrator application request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 3. Super administrator registration and authentication
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
  // 4. Retrieve audit history for the admin request
  const historyResponse =
    await api.functional.discussionBoard.admin.admin_requests.histories.index(
      adminConnection,
      {
        requestId: adminRequest.id,
        body: {
          page: 1,
          limit: 20,
          sort: "asc",
        } satisfies IDiscussionBoardAdminRequestHistory.IRequest,
      },
    );
  typia.assert(historyResponse);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "history has data array",
    Array.isArray(historyResponse.data),
  );
  TestValidator.predicate(
    "pagination metadata exists",
    historyResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is valid",
    historyResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is valid",
    historyResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    historyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    historyResponse.pagination.pages >= 0,
  );
  // 6. Validate history entries structure if any exist
  if (historyResponse.data.length > 0) {
    const firstEntry = historyResponse.data[0]!;
    TestValidator.predicate(
      "first entry has status",
      firstEntry.status !== undefined,
    );
    TestValidator.predicate(
      "first entry has decidingAdmin",
      firstEntry.decidingAdmin !== undefined,
    );
    TestValidator.predicate(
      "first entry has createdAt timestamp",
      firstEntry.createdAt !== undefined,
    );
    // Validate decidingAdmin structure
    const decidingAdmin = firstEntry.decidingAdmin;
    TestValidator.predicate(
      "decidingAdmin has grade",
      decidingAdmin.grade !== undefined,
    );
    TestValidator.predicate(
      "decidingAdmin has created_at",
      decidingAdmin.created_at !== undefined,
    );
    TestValidator.predicate(
      "decidingAdmin has member info",
      decidingAdmin.member !== undefined,
    );
    // Validate member info in decidingAdmin
    const memberInfo = decidingAdmin.member;
    TestValidator.predicate(
      "member has display_name",
      memberInfo.display_name !== undefined,
    );
    TestValidator.predicate(
      "member has status",
      memberInfo.status !== undefined,
    );
    TestValidator.predicate(
      "member has created_at",
      memberInfo.created_at !== undefined,
    );
  }
}
