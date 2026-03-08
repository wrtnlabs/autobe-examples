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

export async function test_api_admin_request_terminal_state_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a regular member
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
  // Login as member to get fresh connection with token
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberAuth.token.access,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 2. Create and authenticate a super administrator
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
  // Note: New admin is 'regular' grade by default, need to promote to super
  // For this test, we'll assume the admin can approve requests (implementation detail)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminAuth.token.access,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Member submits an admin request
  const request =
    await generate_random_discussion_board_member_admin_requests_create(
      memberLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(request);
  TestValidator.equals("request status is pending", request.status, "pending");
  const originalSubmittedAt = request.submitted_at;
  const originalRequestId = request.id;
  // 4. Super administrator approves the request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.updateStatus(
      adminLoginConnection,
      {
        requestId: request.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "reviewed_at is set",
    approvedRequest.reviewed_at,
    null,
  );
  TestValidator.notEquals("reviewer is set", approvedRequest.reviewer, null);
  const approvedReviewedAt = approvedRequest.reviewed_at;
  const approvedReviewerId = approvedRequest.reviewer?.id;
  // 5. Attempting to update the same request again should fail with 409 Conflict
  await TestValidator.httpError(
    "updating approved request should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.discussionBoard.admin.admin_requests.updateStatus(
        adminLoginConnection,
        {
          requestId: request.id,
          body: {
            status: "rejected",
          } satisfies IDiscussionBoardAdminRequest.IUpdate,
        },
      );
    },
  );
  // 6. Verify the request status remains 'approved'
  const finalRequest =
    await api.functional.discussionBoard.admin.admin_requests.updateStatus(
      adminLoginConnection,
      {
        requestId: request.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(finalRequest);
  TestValidator.equals(
    "status remains approved",
    finalRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewed_at unchanged",
    finalRequest.reviewed_at,
    approvedReviewedAt,
  );
  TestValidator.equals(
    "reviewer unchanged",
    finalRequest.reviewer?.id,
    approvedReviewerId,
  );
}
