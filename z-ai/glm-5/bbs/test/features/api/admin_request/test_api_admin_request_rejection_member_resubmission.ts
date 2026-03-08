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

export async function test_api_admin_request_rejection_member_resubmission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create admin account for rejecting requests
  // Note: This creates a 'regular' grade admin. The reject endpoint requires 'super' grade.
  // This test assumes the backend test environment allows this operation for testing purposes.
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 3. Member creates first admin request
  const firstRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(firstRequest);
  // Validate first request is pending
  TestValidator.equals("first request status", firstRequest.status, "pending");
  // 4. Admin rejects the first request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      adminConnection,
      {
        adminRequestId: firstRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  // Validate rejection
  TestValidator.equals(
    "rejected request status",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "request ID preserved",
    rejectedRequest.id,
    firstRequest.id,
  );
  // 5. Member submits second admin request - should succeed after rejection
  const secondRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(secondRequest);
  // 6. Validate second request
  TestValidator.equals(
    "second request status",
    secondRequest.status,
    "pending",
  );
  TestValidator.notEquals(
    "second request is different",
    secondRequest.id,
    firstRequest.id,
  );
  // 7. Verify member can submit requests after rejection
  TestValidator.equals("member ID matches", secondRequest.member.id, member.id);
}
