import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { generate_random_discussion_board_super_admin_admin_requests_decide } from "../../../generate/generate_random_discussion_board_super_admin_admin_requests_decide";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_admin_request_decision } from "../../../prepare/prepare_random_discussion_board_admin_request_decision";

export async function test_api_admin_request_already_decided_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Member submits admin request
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status should be pending",
    adminRequest.status,
    "pending",
  );
  // 3. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 4. Super admin approves the request (first decision)
  const firstDecision =
    await api.functional.discussionBoard.superAdmin.admin_requests.decide(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          admin_request_id: adminRequest.id,
          decision: "approved",
        } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
      },
    );
  typia.assert(firstDecision);
  TestValidator.equals(
    "first decision should be approved",
    firstDecision.decision,
    "approved",
  );
  // 5. Super admin tries to decide on same request again (second decision)
  await TestValidator.error(
    "should throw error for already decided request",
    async () => {
      await api.functional.discussionBoard.superAdmin.admin_requests.decide(
        superAdminConnection,
        {
          requestId: adminRequest.id,
          body: {
            admin_request_id: adminRequest.id,
            decision: "rejected",
          } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
        },
      );
    },
  );
  // 6. Verify request status remains 'approved' by fetching it again
  // Note: There's no GET endpoint for individual admin requests in the provided API,
  // so we rely on the error handling to confirm the business rule is enforced
}
