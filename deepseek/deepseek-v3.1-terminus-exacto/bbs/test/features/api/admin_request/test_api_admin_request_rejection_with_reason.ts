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

export async function test_api_admin_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Member submits admin request using utility function
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
  // Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Super admin rejects the request with reason using utility function
  const rejectionReason = RandomGenerator.paragraph({ sentences: 2 });
  const decision =
    await generate_random_discussion_board_super_admin_admin_requests_decide(
      superAdminConnection,
      {
        body: {
          admin_request_id: adminRequest.id,
          decision: "rejected",
          rejection_reason: rejectionReason,
        },
        params: {
          requestId: adminRequest.id,
        },
      },
    );
  typia.assert(decision);
  // Validate decision outcome
  TestValidator.equals(
    "decision should be rejected",
    decision.decision,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason should match",
    decision.rejection_reason,
    rejectionReason,
  );
  TestValidator.notEquals(
    "rejection reason should not be null",
    decision.rejection_reason,
    null,
  );
  TestValidator.predicate(
    "should have created_at timestamp",
    () => decision.created_at !== "",
  );
  TestValidator.predicate(
    "should have updated_at timestamp",
    () => decision.updated_at !== "",
  );
  // Validate request status changed
  TestValidator.equals(
    "admin request status should be rejected",
    decision.adminRequest.status,
    "rejected",
  );
  // Validate member remains regular member (no admin privileges)
  TestValidator.equals(
    "member admin_grade should remain null",
    memberAuth.admin_grade,
    null,
  );
  // Validate super admin info in decision
  TestValidator.equals(
    "super admin id should match",
    decision.superAdmin.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "super admin email should match",
    decision.superAdmin.email,
    superAdminAuth.email,
  );
}
