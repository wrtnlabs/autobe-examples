import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test successful administrator privilege request submission by an authenticated member.
 *
 * Scenario: A member who wants to contribute to platform moderation submits an admin request.
 *
 * Steps:
 * 1. Register and authenticate as a new member via /discussionBoard/auth/member/join
 * 2. Submit POST /discussionBoard/member/admin-requests with a meaningful reason
 * 3. Verify response contains: id (UUID), reason (matching submitted text), status='pending',
 *    member object with requester profile, reviewer=null, created_at, updated_at timestamps
 * 4. Verify status is exactly 'pending' indicating the request is awaiting super administrator review
 * 5. Verify member association correctly references the authenticated member's profile
 *
 * Business validations:
 * - Request is created with pending status
 * - Member information is correctly embedded in response
 * - Reviewer field is null (not yet reviewed)
 * - Timestamps are recorded accurately
 */
export async function test_api_admin_request_submission_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Step 2: Submit admin request with meaningful reason
  const reason = RandomGenerator.paragraph({ sentences: 5 });
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: reason,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Step 3-5: Validate the response
  TestValidator.equals("status is pending", adminRequest.status, "pending");
  TestValidator.equals("reason matches", adminRequest.reason, reason);
  TestValidator.equals("reviewer is null", adminRequest.reviewer, null);
  TestValidator.equals(
    "member id matches",
    adminRequest.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member displayName matches",
    adminRequest.member.displayName,
    authorizedMember.displayName,
  );
}
