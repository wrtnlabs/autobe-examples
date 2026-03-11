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
 * Test retrieving audit history for an administrator application request.
 *
 * Note: The scenario mentions rejecting the request, but no reject endpoint
 * is available in the provided SDK functions. This test validates the history
 * retrieval functionality with the available APIs, verifying that the audit
 * trail captures the initial pending status when a member submits an admin request.
 *
 * Test Steps:
 * 1. Member registers and submits admin request
 * 2. Super administrator authenticates
 * 3. Retrieve and validate audit history
 */
export async function test_api_admin_request_history_rejected_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and admin request submission
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // 2. Submit administrator request with valid justification reason (50-2000 chars)
  const reasonText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 8,
  });
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Verify request is in pending status
  TestValidator.equals("request status", adminRequest.status, "pending");
  TestValidator.predicate(
    "reason length valid (50-2000 chars)",
    adminRequest.reason.length >= 50 && adminRequest.reason.length <= 2000,
  );
  // 3. Super administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
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
  typia.assert(admin);
  // Verify admin has super grade
  TestValidator.equals("admin grade", admin.grade, "super");
  // 4. Retrieve audit history for the admin request
  const history =
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
  typia.assert(history);
  // 5. Validate history response structure
  TestValidator.predicate("has history entries", history.data.length >= 1);
  // Validate first history entry (initial pending status)
  const firstEntry = history.data[0]!;
  TestValidator.equals("first entry status", firstEntry.status, "pending");
  TestValidator.predicate(
    "first entry has deciding admin",
    firstEntry.decidingAdmin !== undefined,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records match data length",
    history.pagination.records >= history.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    history.pagination.pages >= 1,
  );
  // Validate deciding admin structure in all entries (business logic, not type)
  for (const entry of history.data) {
    TestValidator.predicate(
      "deciding admin has grade",
      entry.decidingAdmin.grade !== undefined,
    );
    TestValidator.predicate(
      "deciding admin has member info",
      entry.decidingAdmin.member !== undefined,
    );
  }
}
