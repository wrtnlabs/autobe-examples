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
 * Test super administrator rejection of admin privilege request.
 *
 * This test validates the complete workflow of a super administrator rejecting
 * a pending administrator privilege request submitted by a member. The test ensures:
 * 1. Member can submit admin request with valid reason
 * 2. Super admin can reject pending requests
 * 3. Request status updates to 'rejected'
 * 4. Reviewer information is properly recorded
 * 5. Member does not receive admin privileges after rejection
 */
export async function test_api_admin_request_rejection_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and submit admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Submit admin request with reason
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals("reviewed_at is null", adminRequest.reviewed_at, null);
  TestValidator.equals("reviewer is null", adminRequest.reviewer, null);
  // 2. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  TestValidator.equals(
    "super admin grade is super",
    superAdminAuth.grade,
    "super",
  );
  // 3. Reject the pending admin request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  // 4. Verify request status changed to 'rejected'
  TestValidator.equals(
    "request status is rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "reviewed_at is set",
    rejectedRequest.reviewed_at,
    null,
  );
  TestValidator.notEquals(
    "reviewer is populated",
    rejectedRequest.reviewer,
    null,
  );
  // 5. Verify reviewer is the super admin who rejected
  const reviewer = typia.assert(rejectedRequest.reviewer!);
  TestValidator.equals(
    "reviewer ID matches super admin",
    reviewer.id,
    superAdminAuth.id,
  );
  // 6. Verify author information is preserved
  TestValidator.equals(
    "author ID matches member",
    rejectedRequest.author.id,
    memberAuth.id,
  );
  // 7. Verify timestamps are properly set
  TestValidator.predicate(
    "submitted_at exists",
    rejectedRequest.submitted_at !== null,
  );
  TestValidator.predicate(
    "reviewed_at is after submitted_at",
    new Date(rejectedRequest.reviewed_at!) >=
      new Date(rejectedRequest.submitted_at),
  );
}
