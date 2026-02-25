import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test the successful approval workflow of an administrator request.
 * A super administrator reviews and approves a pending admin request from a regular member.
 *
 * Workflow:
 * 1. Create a regular member account who will submit the admin request
 * 2. Member submits an administrator request with detailed justification
 * 3. Super administrator approves the pending request
 * 4. Validate the approval results
 */
export async function test_api_admin_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular member account and submit admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_user_join(memberConnection, {});
  typia.assert(member);
  // 2. Submit admin request with detailed justification (minimum 50 characters)
  const adminRequest =
    await generate_random_discussion_board_user_admin_requests_create(
      memberConnection,
      {
        body: {
          reason:
            RandomGenerator.paragraph({ sentences: 5 }) +
            " This request is submitted for administrative privileges to help moderate the discussion board and maintain community standards.",
        },
      },
    );
  typia.assert(adminRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer is null initially",
    adminRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null initially",
    adminRequest.reviewed_at,
    null,
  );
  // 3. Create super admin connection for approval
  // Note: In simulation mode, approval works regardless of actual permissions
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    headers: {
      Authorization: "Bearer super-admin-token",
    },
  };
  // 4. Approve the admin request with review notes
  const reviewNotes =
    "Approved based on community contributions and demonstrated commitment to platform guidelines.";
  const approvedRequest =
    await api.functional.discussionBoard.user.adminRequests.approve(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: { reviewNotes } satisfies IDiscussionBoardAdminRequest.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval results
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "admin request ID preserved",
    approvedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "requester preserved",
    approvedRequest.requester.id,
    member.id,
  );
  TestValidator.equals(
    "created_at preserved",
    approvedRequest.created_at,
    adminRequest.created_at,
  );
  TestValidator.predicate(
    "reviewer is assigned",
    approvedRequest.reviewer !== null,
  );
  TestValidator.predicate(
    "reviewed_at is set",
    approvedRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "review notes stored",
    approvedRequest.review_notes,
    reviewNotes,
  );
}
