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
 * Test that an administrator can retrieve detailed information about an administrator privilege escalation request that has already been decided (approved or rejected).
 *
 * The test verifies:
 * 1) The request status reflects the decision outcome ('approved' or 'rejected')
 * 2) The reviewingAdministrator field contains the super administrator's information who made the decision
 * 3) The reviewed_at timestamp is present and reflects when the decision was made
 * 4) The decision object is included with decision_type, decision_context (if provided), and reviewer information
 * 5) The adminRequest relationship within the decision object correctly references the original request
 */
export async function test_api_admin_request_retrieve_with_decision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Setup - Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create admin privilege request as member
  const request =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request);
  // 3. Administrator Setup - Register and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 4. Super administrator makes a decision (approve the request)
  const decision =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      adminConnection,
      {
        params: {
          requestId: request.id,
        },
        body: {
          decision_type: "approved",
          decision_context:
            "Member has demonstrated good community involvement",
        },
      },
    );
  typia.assert(decision);
  // 5. Retrieve the request as administrator to verify decision details
  const retrievedRequest =
    await api.functional.discussionBoard.administrator.admin_requests.at(
      adminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate the retrieved request contains decision information
  TestValidator.equals(
    "request status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.equals("request ID matches", retrievedRequest.id, request.id);
  TestValidator.equals(
    "reviewing administrator ID matches",
    retrievedRequest.reviewingAdministrator.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "reviewed_at is present",
    retrievedRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "decision type is approved",
    retrievedRequest.decision.decision_type,
    "approved",
  );
  TestValidator.equals(
    "decision context is present",
    retrievedRequest.decision.decision_context,
    "Member has demonstrated good community involvement",
  );
  TestValidator.equals(
    "decision reviewer is the admin",
    retrievedRequest.decision.reviewer.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "adminRequest in decision references original",
    retrievedRequest.decision.adminRequest.id,
    request.id,
  );
  TestValidator.equals(
    "member in request matches",
    retrievedRequest.member.id,
    memberAuth.id,
  );
}
