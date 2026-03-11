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

export async function test_api_admin_request_decision_approval_with_valid_request(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register a member
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
  // Create admin request as member
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
  TestValidator.equals(
    "admin request status should be pending",
    adminRequest.status,
    "pending",
  );
  // Create super admin connection and authenticate
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
  // Approve the admin request as super admin
  const decision =
    await generate_random_discussion_board_super_admin_admin_request_decisions_create(
      superAdminConnection,
      {
        body: {
          admin_request_id: adminRequest.id,
          decision: "approved" as const,
          rejection_reason: null,
        } satisfies IDiscussionBoardAdminRequestDecision.ICreate,
      },
    );
  typia.assert(decision);
  // Validate decision record
  TestValidator.equals(
    "decision should be approved",
    decision.decision,
    "approved",
  );
  TestValidator.equals(
    "rejection_reason should be null for approval",
    decision.rejection_reason,
    null,
  );
  TestValidator.equals(
    "admin request ID should match",
    decision.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "super admin ID should match",
    decision.superAdmin.id,
    superAdminAuth.id,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    () => !isNaN(new Date(decision.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(new Date(decision.updated_at).getTime()),
  );
  // Verify admin request status is updated to approved
  TestValidator.equals(
    "admin request status should be approved",
    decision.adminRequest.status,
    "approved",
  );
  // Verify member privileges are elevated (this would require additional API call to check member status)
  // Since we don't have an API endpoint to retrieve member details by ID, we can't validate this directly
  // The business logic validation is implied by the successful approval workflow
}
