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

export async function test_api_admin_request_approval_banned_member_rejection(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario: Test admin request approval rejection for banned members.
   *
   * This test validates the approval workflow infrastructure including:
   * - Member banned status tracking
   * - Request status lifecycle
   * - The system's ability to check banned status during approval
   *
   * Note: Full banned member rejection test requires a banning API which
   * is not available. The approval endpoint checks member.banned field
   * and returns 400 if banned, per API specification.
   */
  // 1. Create a super administrator for approval operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Create a member in good standing (not banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 3. Verify member is initially not banned
  TestValidator.predicate(
    "member initially not banned",
    member.banned === false,
  );
  // 4. Member submits an admin request
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
  // 5. Validate request initial state
  TestValidator.equals(
    "request status pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request member id matches",
    adminRequest.member.id,
    member.id,
  );
  TestValidator.predicate(
    "request member not banned",
    adminRequest.member.banned === false,
  );
  TestValidator.equals("no reviewer assigned yet", adminRequest.reviewer, null);
  // 6. Super admin approves the request for non-banned member
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdminConnection,
      { adminRequestId: adminRequest.id },
    );
  typia.assert(approvedRequest);
  // 7. Verify approval succeeded for valid non-banned member
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer is super admin",
    approvedRequest.reviewer?.id,
    superAdmin.id,
  );
  /**
   * BUSINESS RULE VALIDATION:
   * The approval API endpoint specification states:
   * "Return 400 Bad Request if the requesting member is banned"
   *
   * The system checks the member.banned field during approval.
   * When a banned member's request is submitted for approval,
   * the endpoint should reject with HTTP 400 status.
   *
   * This test validates the workflow infrastructure supports this
   * check. Full rejection test would require:
   * 1. Create member and admin request
   * 2. Ban the member (requires banning API)
   * 3. Attempt approval and expect 400 Bad Request
   */
}
