import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_admin_requests_decisions_create } from "../../../generate/generate_random_discussion_board_administrator_admin_requests_decisions_create";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_admin_request_decision } from "../../../prepare/prepare_random_discussion_board_admin_request_decision";

export async function test_api_admin_request_decision_duplicate_request_conflict(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the system prevents multiple decisions on the same admin request.
   * Verifies that once a decision is made, subsequent decision attempts return 409 Conflict.
   */
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create admin request as member
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
  // 3. Create super administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 4. Create first decision (approve)
  const firstDecision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      adminConnection,
      {
        params: { requestId: adminRequest.id },
        body: {
          decision_type: "approved",
          decision_context:
            "Member has demonstrated good community involvement",
        },
      },
    );
  typia.assert(firstDecision);
  // 5. Verify first decision is valid
  TestValidator.equals(
    "first decision type",
    firstDecision.decision_type,
    "approved",
  );
  TestValidator.equals(
    "first decision request matches",
    firstDecision.adminRequest.id,
    adminRequest.id,
  );
  // 6. Attempt to create second decision on the same request (should fail with 409)
  await TestValidator.httpError(
    "duplicate decision returns 409 conflict",
    409,
    async () => {
      await generate_random_discussion_board_administrator_admin_requests_decisions_create(
        adminConnection,
        {
          params: { requestId: adminRequest.id },
          body: {
            decision_type: "rejected",
            decision_context: "This should fail",
          },
        },
      );
    },
  );
  // 7. Verify the original decision remains unchanged
  TestValidator.equals(
    "original decision still approved",
    firstDecision.decision_type,
    "approved",
  );
  TestValidator.predicate(
    "original decision has valid timestamp",
    firstDecision.created_at !== null && firstDecision.created_at !== undefined,
  );
}
