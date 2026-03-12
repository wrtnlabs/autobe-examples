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

export async function test_api_admin_request_decision_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving a rejected administrator privilege escalation decision.
   * This test validates that a super administrator can retrieve the complete
   * decision record for a rejected admin request, including decision type,
   * rejection context, timestamps, and relationships to both the requesting
   * member and reviewing super administrator.
   */
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create and authenticate member
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
  // 3. Submit admin privilege escalation request from member
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
  // 4. Create rejected decision by super administrator
  const rejectionContext =
    "Request rejected due to insufficient experience and lack of community contribution.";
  const decision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdminConnection,
      {
        params: {
          requestId: adminRequest.id,
        },
        body: {
          decision_type: "rejected",
          decision_context: rejectionContext,
        },
      },
    );
  typia.assert(decision);
  // 5. Retrieve the rejected decision
  const retrievedDecision =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.at(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        decisionId: decision.id,
      },
    );
  typia.assert(retrievedDecision);
  // 6. Validate decision details
  TestValidator.equals(
    "decision type is rejected",
    retrievedDecision.decision_type,
    "rejected",
  );
  TestValidator.equals(
    "rejection context matches",
    retrievedDecision.decision_context,
    rejectionContext,
  );
  TestValidator.predicate(
    "decision has valid created_at timestamp",
    retrievedDecision.created_at !== null,
  );
  TestValidator.predicate(
    "decision has valid updated_at timestamp",
    retrievedDecision.updated_at !== null,
  );
  // 7. Validate reviewer relationship (super administrator)
  TestValidator.equals(
    "reviewer exists",
    retrievedDecision.reviewer.id !== null,
    true,
  );
  TestValidator.predicate(
    "reviewer has valid email",
    retrievedDecision.reviewer.email !== null,
  );
  // 8. Validate adminRequest relationship
  TestValidator.equals(
    "admin request ID matches",
    retrievedDecision.adminRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "admin request status is rejected",
    retrievedDecision.adminRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "admin request has reviewed_at timestamp",
    retrievedDecision.adminRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "admin request member matches original",
    retrievedDecision.adminRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "admin request reason preserved",
    retrievedDecision.adminRequest.reason,
    adminRequest.reason,
  );
}
