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
import { generate_random_discussion_board_super_admin_admin_request_decisions_create } from "../../../generate/generate_random_discussion_board_super_admin_admin_request_decisions_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_admin_request_decision } from "../../../prepare/prepare_random_discussion_board_admin_request_decision";

export async function test_api_admin_request_decision_update_approved_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate member
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
    },
  });
  typia.assert(member);
  // 3. Member submits admin request
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
  // 4. Super admin creates initial approved decision
  const initialDecision =
    await generate_random_discussion_board_super_admin_admin_request_decisions_create(
      superAdminConnection,
      {
        body: {
          admin_request_id: adminRequest.id,
          decision: "approved" as const,
          rejection_reason: null,
        },
      },
    );
  typia.assert(initialDecision);
  // 5. Super admin updates the decision status
  const updateBody: IDiscussionBoardAdminRequestDecision.IUpdate = {
    decision: "rejected" as const,
    rejection_reason: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const updatedDecision =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.update(
      superAdminConnection,
      {
        decisionId: initialDecision.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDecision);
  // 6. Validate audit trail integrity
  TestValidator.equals(
    "decision ID should remain unchanged",
    updatedDecision.id,
    initialDecision.id,
  );
  TestValidator.equals(
    "admin request reference should remain unchanged",
    updatedDecision.adminRequest.id,
    initialDecision.adminRequest.id,
  );
  TestValidator.equals(
    "super admin reference should remain unchanged",
    updatedDecision.superAdmin.id,
    initialDecision.superAdmin.id,
  );
  TestValidator.equals(
    "creation timestamp should be preserved",
    updatedDecision.created_at,
    initialDecision.created_at,
  );
  TestValidator.notEquals(
    "update timestamp should change",
    updatedDecision.updated_at,
    initialDecision.updated_at,
  );
  // 7. Verify updated decision details
  TestValidator.equals(
    "decision status should be updated",
    updatedDecision.decision,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason should match update",
    updatedDecision.rejection_reason,
    updateBody.rejection_reason,
  );
}
