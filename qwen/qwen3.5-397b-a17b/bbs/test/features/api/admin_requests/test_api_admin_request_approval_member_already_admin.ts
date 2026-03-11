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
 * Test the edge case where a super administrator attempts to approve a request
 * from a member who already holds administrator privileges.
 *
 * Test Steps:
 * 1. Create a super administrator account via /auth/admin/join
 * 2. Create a member account via /auth/member/join
 * 3. Member submits an admin request via /member/admin-requests
 * 4. Super admin approves the request via /admin/admin-requests/{requestId}/approve (member becomes admin)
 * 5. Attempt to approve the same request again (should fail with 409 Conflict since status is no longer pending)
 *
 * Business Validations:
 * - Request status transitions are immutable once decided (pending → approved/rejected)
 * - Second approval attempt on already-approved request is rejected with 409 Conflict
 * - Error response indicates request already decided
 * - System enforces single approval per request rule
 * - Business rule prevents duplicate privilege escalation
 */
export async function test_api_admin_request_approval_member_already_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
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
  typia.assert(superAdmin);
  TestValidator.equals("super admin grade", superAdmin.grade, "super");
  // 2. Create member account
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
  // 3. Member submits admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 20,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request initial status",
    adminRequest.status,
    "pending",
  );
  // 4. Super admin approves the request (member becomes admin)
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request approved status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "request has deciding admin",
    approvedRequest.admin,
    null,
  );
  // 5. Attempt to approve the same request again (should fail - already approved)
  await TestValidator.error("duplicate approval rejected", async () => {
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  });
}
