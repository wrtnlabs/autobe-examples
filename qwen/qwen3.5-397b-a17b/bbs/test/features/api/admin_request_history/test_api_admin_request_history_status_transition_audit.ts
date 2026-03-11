import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestHistory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test the audit trail integrity by verifying history entries accurately capture
 * status transition details for administrator application requests.
 *
 * Test Steps:
 * 1. Authenticate as administrator via /discussionBoard/auth/admin/join
 * 2. Authenticate as member via /discussionBoard/auth/member/join
 * 3. Create an admin request as member via /discussionBoard/member/admin-requests
 * 4. Approve the admin request as admin via /discussionBoard/admin/admin-requests/{requestId}/approve
 * 5. Retrieve the generated history entry via GET /discussionBoard/admin/admin-requests/{requestId}/histories/{historyId}
 * 6. Verify the history entry captures the complete transition audit information
 */
export async function test_api_admin_request_history_status_transition_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create admin account
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
  // 2. Member setup - create member account
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
  // 3. Create admin request as member
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  // 4. Approve the admin request as admin (this generates history entry)
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      adminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status after approval",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "decided_at is set",
    approvedRequest.decided_at !== null,
  );
  TestValidator.predicate(
    "admin is set after approval",
    approvedRequest.admin !== null,
  );
  // 5. Retrieve the history entry
  // Note: In production, there would be a list endpoint to get history IDs.
  // For this test, we generate a history ID that would correspond to the created history entry.
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const historyEntry =
    await api.functional.discussionBoard.admin.admin_requests.histories.at(
      adminConnection,
      {
        requestId: adminRequest.id,
        historyId: historyId,
      },
    );
  typia.assert(historyEntry);
  // 6. Validate the history entry captures complete transition audit information
  TestValidator.equals(
    "history status is approved",
    historyEntry.status,
    "approved",
  );
  TestValidator.predicate(
    "decidingAdmin exists",
    historyEntry.decidingAdmin !== null,
  );
  TestValidator.predicate(
    "decidingAdmin has member info",
    historyEntry.decidingAdmin.member !== null,
  );
  TestValidator.equals(
    "adminRequest matches parent request",
    historyEntry.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason is null for approved request",
    historyEntry.reason,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    historyEntry.created_at !== null,
  );
  TestValidator.equals(
    "adminRequest member matches original member",
    historyEntry.adminRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "adminRequest member display name matches",
    historyEntry.adminRequest.member.display_name,
    memberAuth.display_name,
  );
}
