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

/**
 * Test retrieving an approved administrator privilege escalation decision.
 *
 * This test validates the complete workflow of:
 * 1. Creating a super administrator and a member
 * 2. Member submitting an admin privilege escalation request
 * 3. Super administrator approving the request
 * 4. Retrieving the approved decision record
 * 5. Validating all decision fields and relationships
 */
export async function test_api_admin_request_decision_retrieve_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Member Setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Submit Admin Request as Member
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
  // 4. Create Approved Decision as Super Administrator
  const decision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdminConnection,
      {
        params: {
          requestId: adminRequest.id,
        },
        body: {
          decision_type: "approved",
          decision_context: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(decision);
  // 5. Retrieve the Decision Record
  const retrievedDecision =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        decisionId: decision.id,
      },
    );
  typia.assert(retrievedDecision);
  // 6. Validate Response
  TestValidator.equals(
    "decision_type is approved",
    retrievedDecision.decision_type,
    "approved",
  );
  TestValidator.equals("decision IDs match", retrievedDecision.id, decision.id);
  TestValidator.predicate(
    "decision_context exists",
    retrievedDecision.decision_context !== null,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedDecision.created_at !== undefined,
  );
  TestValidator.predicate(
    "reviewer exists",
    retrievedDecision.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer is super admin",
    retrievedDecision.reviewer.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "adminRequest ID matches",
    retrievedDecision.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "adminRequest status is approved",
    retrievedDecision.adminRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at exists",
    retrievedDecision.adminRequest.reviewed_at !== null,
  );
}
