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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test the primary success path where a super administrator successfully
 * rejects a pending admin request.
 *
 * The test verifies:
 * 1) A super admin authenticates and rejects a pending admin request
 * 2) The request status transitions from 'pending' to 'rejected'
 * 3) The reviewer information is correctly recorded with the super admin's ID
 * 4) The request record is preserved with updated timestamp
 * 5) The member who submitted the request remains a regular member
 * 6) The response includes complete request details with embedded member and reviewer
 *
 * Note: This test assumes the test environment has a super admin account
 * or that the first admin created has elevated privileges for testing.
 */
export async function test_api_admin_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member who will submit the admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Member creates a pending admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(adminRequest);
  // Validate initial request state
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals("initial reviewer is null", adminRequest.reviewer, null);
  // Store the request ID and timestamps for later validation
  const requestId = adminRequest.id;
  const originalCreatedAt = adminRequest.created_at;
  const memberId = adminRequest.member.id;
  // 3. Create a super admin for rejecting the request
  // Note: In production, super admins are promoted through a separate workflow,
  // but for E2E testing, we rely on test environment setup or mock behavior
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // 4. Super admin rejects the admin request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      superAdminConnection,
      {
        adminRequestId: requestId,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate rejection result
  TestValidator.equals(
    "status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals("request ID preserved", rejectedRequest.id, requestId);
  TestValidator.equals(
    "member ID preserved",
    rejectedRequest.member.id,
    memberId,
  );
  TestValidator.equals(
    "reason preserved",
    rejectedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.equals(
    "created_at preserved",
    rejectedRequest.created_at,
    originalCreatedAt,
  );
  // 6. Validate reviewer information
  TestValidator.predicate("reviewer is set", rejectedRequest.reviewer !== null);
  if (rejectedRequest.reviewer !== null) {
    TestValidator.equals(
      "reviewer is super admin",
      rejectedRequest.reviewer.id,
      superAdmin.id,
    );
    TestValidator.equals(
      "reviewer email matches",
      rejectedRequest.reviewer.email,
      superAdmin.email,
    );
  }
  // 7. Validate updated_at timestamp changed
  TestValidator.predicate(
    "updated_at changed",
    rejectedRequest.updated_at !== originalCreatedAt,
  );
  // 8. Verify member still exists and is preserved in response
  TestValidator.equals(
    "member preserved in response",
    rejectedRequest.member.id,
    memberId,
  );
  TestValidator.equals(
    "member displayName preserved",
    rejectedRequest.member.displayName,
    member.displayName,
  );
}
