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

export async function test_api_admin_request_decision_super_admin_soft_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Step 2: Create and authenticate member account
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
    },
  });
  typia.assert(memberAuth);
  // Step 3: Member submits admin request
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
  // Step 4: Super admin creates decision record
  const decision =
    await generate_random_discussion_board_super_admin_admin_request_decisions_create(
      superAdminConnection,
      {
        body: {
          admin_request_id: adminRequest.id,
          decision: RandomGenerator.pick(["approved", "rejected"] as const),
          rejection_reason:
            RandomGenerator.pick(["approved", "rejected"] as const) ===
            "rejected"
              ? RandomGenerator.paragraph({ sentences: 2 })
              : null,
        },
      },
    );
  typia.assert(decision);
  // Step 5: Super admin performs soft deletion
  await api.functional.discussionBoard.superAdmin.admin_request_decisions.erase(
    superAdminConnection,
    {
      decisionId: decision.id,
    },
  );
  // Step 6: Validate that only super admin can perform deletion
  // Attempt deletion with member credentials (should fail)
  await TestValidator.error(
    "member should not be able to delete admin request decisions",
    async () => {
      await api.functional.discussionBoard.superAdmin.admin_request_decisions.erase(
        memberConnection,
        {
          decisionId: decision.id,
        },
      );
    },
  );
  // Step 7: Validate decision data integrity was preserved
  TestValidator.predicate(
    "decision ID should be valid UUID",
    typia.is<string & tags.Format<"uuid">>(decision.id),
  );
  TestValidator.predicate(
    "admin request ID should match",
    decision.adminRequest.id === adminRequest.id,
  );
  TestValidator.predicate(
    "decision should have valid status",
    decision.decision === "approved" || decision.decision === "rejected",
  );
  TestValidator.predicate(
    "decision should have valid creation timestamp",
    typia.is<string & tags.Format<"date-time">>(decision.created_at),
  );
}
