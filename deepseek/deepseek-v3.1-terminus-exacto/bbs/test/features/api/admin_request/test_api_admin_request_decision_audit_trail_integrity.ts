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

export async function test_api_admin_request_decision_audit_trail_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create and authenticate member
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
  // 3. Member submits admin request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. SuperAdmin creates initial decision
  const initialDecision =
    await generate_random_discussion_board_super_admin_admin_request_decisions_create(
      superAdminConnection,
      {
        body: {
          admin_request_id: adminRequest.id,
          decision: "approved" as const,
        } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
      },
    );
  typia.assert(initialDecision);
  // Store creation timestamp for audit trail validation
  const originalCreatedAt = initialDecision.created_at;
  // 5. Update decision multiple times - no utility function available, use SDK directly
  const firstUpdate =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.update(
      superAdminConnection,
      {
        decisionId: initialDecision.id,
        body: {
          decision: "rejected" as const,
          rejection_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdminRequestDecision.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  const secondUpdate =
    await api.functional.discussionBoard.superAdmin.admin_request_decisions.update(
      superAdminConnection,
      {
        decisionId: initialDecision.id,
        body: {
          decision: "approved" as const,
          rejection_reason: null,
        } satisfies IDiscussionBoardAdminRequestDecision.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  // 6. Validate audit trail integrity
  TestValidator.equals(
    "creation timestamp remains unchanged",
    originalCreatedAt,
    secondUpdate.created_at,
  );
  TestValidator.notEquals(
    "update timestamp progresses",
    initialDecision.updated_at,
    secondUpdate.updated_at,
  );
  TestValidator.predicate(
    "update timestamps should be chronological",
    new Date(initialDecision.updated_at) < new Date(firstUpdate.updated_at) &&
      new Date(firstUpdate.updated_at) < new Date(secondUpdate.updated_at),
  );
  // 7. Verify related entity references remain consistent
  TestValidator.equals(
    "admin request reference remains consistent",
    initialDecision.adminRequest.id,
    secondUpdate.adminRequest.id,
  );
  TestValidator.equals(
    "superAdmin reference remains consistent",
    initialDecision.superAdmin.id,
    secondUpdate.superAdmin.id,
  );
  TestValidator.equals(
    "decision ID remains consistent",
    initialDecision.id,
    secondUpdate.id,
  );
  // 8. Validate decision status business rules
  TestValidator.equals(
    "rejection reason present when decision is rejected",
    firstUpdate.rejection_reason !== null,
    firstUpdate.decision === "rejected",
  );
  TestValidator.equals(
    "rejection reason null when decision is approved",
    secondUpdate.rejection_reason === null,
    secondUpdate.decision === "approved",
  );
}
