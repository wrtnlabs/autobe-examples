import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestDecision";
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

export async function test_api_admin_request_decisions_regular_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a regular administrator (grade='regular') is denied access to the decisions endpoint.
   *
   * This test verifies that only super administrators can access the admin request decisions endpoint,
   * ensuring proper separation of duties in the moderation system.
   */
  // 1. Create and authenticate regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  await authorize_administrator_join(regularAdminConnection, {
    body: regularAdminCreds,
  });
  // 2. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdministrator.IJoin;
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: superAdminCreds,
    },
  );
  typia.assert(superAdminAuth);
  // 3. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCreds,
  });
  // 4. Member submits admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {},
    );
  typia.assert(adminRequest);
  // 5. Super admin makes decision on the request (to have test data)
  const decision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdminConnection,
      {
        params: { requestId: adminRequest.id },
        body: {
          decision_type: "approved",
          decision_context: "Test decision by super admin",
        },
      },
    );
  typia.assert(decision);
  // 6. Regular admin attempts to access decisions endpoint - should be denied
  await TestValidator.error(
    "regular admin denied access to decisions endpoint",
    async () => {
      await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
        regularAdminConnection,
        {
          body: {} satisfies IDiscussionBoardAdminRequestDecision.IRequest,
        },
      );
    },
  );
}
