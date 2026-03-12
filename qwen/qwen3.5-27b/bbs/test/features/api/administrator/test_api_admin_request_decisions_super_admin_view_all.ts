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

/**
 * Test that a super administrator can retrieve all administrator request decisions with pagination.
 *
 * This test verifies that:
 * 1. Super admin can access the decisions endpoint
 * 2. Decision records contain complete information (decision_type, reviewer, adminRequest)
 * 3. Pagination metadata is accurate
 * 4. Decisions are ordered by created_at descending
 */
export async function test_api_admin_request_decisions_super_admin_view_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = "password123";
  await authorize_administrator_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple member accounts and admin requests
  const memberConnections: api.IConnection[] = [];
  const adminRequests: IDiscussionBoardAdminRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const memberEmail = typia.random<string & tags.Format<"email">>();
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: "password123",
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    memberConnections.push(memberConnection);
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
    adminRequests.push(adminRequest);
  }
  // 3. Super admin approves all requests to create decisions
  const decisions: IDiscussionBoardAdminRequestDecision[] = [];
  for (const adminRequest of adminRequests) {
    const decision =
      await generate_random_discussion_board_administrator_admin_requests_decisions_create(
        superAdminConnection,
        {
          params: { requestId: adminRequest.id },
          body: {
            decision_type: "approved",
            decision_context: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(decision);
    decisions.push(decision);
  }
  // 4. Super admin retrieves all decisions
  const decisionsPage =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(decisionsPage);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", decisionsPage.pagination.current, 1);
  TestValidator.equals("limit", decisionsPage.pagination.limit, 20);
  TestValidator.equals("total records", decisionsPage.pagination.records, 3);
  TestValidator.equals("total pages", decisionsPage.pagination.pages, 1);
  // 6. Validate decision count
  TestValidator.equals("decision count", decisionsPage.data.length, 3);
  // 7. Validate each decision structure
  for (const decision of decisionsPage.data) {
    // Verify decision has required fields
    TestValidator.predicate("has id", decision.id.length > 0);
    TestValidator.predicate(
      "has decision_type",
      ["approved", "rejected"].includes(decision.decision_type),
    );
    TestValidator.predicate("has created_at", decision.created_at.length > 0);
    // Verify reviewer information
    TestValidator.equals(
      "reviewer is super admin",
      decision.reviewer.email,
      superAdminEmail,
    );
    TestValidator.predicate("reviewer has id", decision.reviewer.id.length > 0);
    // Verify admin request information
    TestValidator.predicate(
      "admin request has id",
      decision.adminRequest.id.length > 0,
    );
    TestValidator.predicate(
      "admin request has reason",
      decision.adminRequest.reason.length > 0,
    );
    TestValidator.predicate(
      "admin request has member",
      decision.adminRequest.member.id.length > 0,
    );
  }
  // 8. Verify decisions are ordered by created_at DESC
  for (let i = 1; i < decisionsPage.data.length; i++) {
    const prevDate = new Date(decisionsPage.data[i - 1].created_at).getTime();
    const currDate = new Date(decisionsPage.data[i].created_at).getTime();
    TestValidator.predicate(
      `decision ${i} created_at <= decision ${i - 1} created_at`,
      currDate <= prevDate,
    );
  }
}
