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
 * Test the history entry audit trail for administrator application requests.
 *
 * This test validates the admin request creation workflow and prepares the foundation
 * for history audit testing. It verifies that admin requests are properly created with
 * valid justification reasons and correct initial status.
 *
 * Note: Complete rejection history audit testing requires a reject endpoint (PUT/PATCH)
 * to transition the request status and create history entries. This endpoint is not
 * currently in the available API functions. The test validates the prerequisite state
 * (admin request creation) and documents the structure needed for full audit testing.
 *
 * When the reject endpoint becomes available, the test should be extended to:
 * 1. Reject the admin request with a specific rejection reason (50-2000 characters)
 * 2. Retrieve the history entry via GET /admin-requests/{requestId}/histories/{historyId}
 * 3. Validate rejection reason is captured in historyEntry.reason field
 * 4. Verify historyEntry.status equals 'rejected'
 * 5. Confirm decidingAdmin references the administrator who rejected the request
 */
export async function test_api_admin_request_history_rejection_reason_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
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
  // 2. Create member account with stored credentials
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Authenticate as member using same credentials
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Create admin request as member with valid justification reason
  const reasonText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberLoginConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 5. Validate admin request structure and business rules
  TestValidator.equals(
    "admin request initial status",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "admin request member reference",
    adminRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "admin request reason matches input",
    adminRequest.reason,
    reasonText,
  );
  TestValidator.predicate(
    "reason meets minimum length (50 chars)",
    adminRequest.reason.length >= 50,
  );
  TestValidator.predicate(
    "reason meets maximum length (2000 chars)",
    adminRequest.reason.length <= 2000,
  );
  TestValidator.predicate(
    "submitted_at timestamp present",
    adminRequest.submitted_at !== null,
  );
  TestValidator.predicate(
    "decided_at is null for pending request",
    adminRequest.decided_at === null,
  );
  TestValidator.predicate(
    "admin is null for pending request",
    adminRequest.admin === null,
  );
  // 6. Validate member profile in admin request
  TestValidator.equals(
    "member display name matches",
    adminRequest.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "member bio matches",
    adminRequest.member.bio,
    memberAuth.bio,
  );
  TestValidator.equals(
    "member is_admin flag",
    adminRequest.member.is_admin,
    false,
  );
  // Note: History entry retrieval and rejection reason audit testing requires
  // the admin request reject endpoint (PUT/PATCH /admin-requests/{id}/reject)
  // which is not in the available API functions. When available, extend test to:
  //
  // const rejectReason = RandomGenerator.content({
  //   paragraphs: 1,
  //   sentenceMin: 5,
  //   sentenceMax: 10,
  //   wordMin: 5,
  //   wordMax: 10,
  // });
  //
  // await api.functional.discussionBoard.admin.admin_requests.reject(
  //   adminConnection,
  //   {
  //     requestId: adminRequest.id,
  //     body: { reason: rejectReason }
  //   }
  // );
  //
  // const historyEntry = await api.functional.discussionBoard.admin.admin_requests.histories.at(
  //   adminConnection,
  //   {
  //     requestId: adminRequest.id,
  //     historyId: createdHistoryId
  //   }
  // );
  //
  // TestValidator.equals("history status", historyEntry.status, "rejected");
  // TestValidator.equals("rejection reason recorded", historyEntry.reason, rejectReason);
  // TestValidator.equals("deciding admin", historyEntry.decidingAdmin.id, adminAuth.id);
}
