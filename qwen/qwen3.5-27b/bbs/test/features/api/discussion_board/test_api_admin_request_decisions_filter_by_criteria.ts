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

export async function test_api_admin_request_decisions_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering administrator request decisions by various criteria.
   * Validates that super administrators can filter decisions by type, reviewer, and date range.
   */
  // 1. Setup: Create first super administrator
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1Email = typia.random<string & tags.Format<"email">>();
  const superAdmin1Password = typia.random<string & tags.Format<"password">>();
  await authorize_administrator_join(superAdmin1Connection, {
    body: {
      email: superAdmin1Email,
      password: superAdmin1Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Setup: Create second super administrator for reviewer filtering
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2Email = typia.random<string & tags.Format<"email">>();
  const superAdmin2Password = typia.random<string & tags.Format<"password">>();
  await authorize_administrator_join(superAdmin2Connection, {
    body: {
      email: superAdmin2Email,
      password: superAdmin2Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Setup: Create first member and submit admin request
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const request1 =
    await generate_random_discussion_board_member_admin_requests_create(
      member1Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request1);
  // 4. Setup: Create second member and submit admin request
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const request2 =
    await generate_random_discussion_board_member_admin_requests_create(
      member2Connection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(request2);
  // 5. Setup: First super admin approves first request
  const decision1 =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdmin1Connection,
      {
        params: { requestId: request1.id },
        body: {
          decision_type: "approved",
          decision_context: "Approved based on qualifications",
        },
      },
    );
  typia.assert(decision1);
  // 6. Setup: Second super admin rejects second request
  const decision2 =
    await generate_random_discussion_board_administrator_admin_requests_decisions_create(
      superAdmin2Connection,
      {
        params: { requestId: request2.id },
        body: {
          decision_type: "rejected",
          decision_context: "Rejected due to insufficient experience",
        },
      },
    );
  typia.assert(decision2);
  // 7. Test: Filter by decision_type='approved'
  const approvedFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision_type: "approved",
    page: 1,
    limit: 20,
  };
  const approvedResult =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  TestValidator.equals(
    "approved filter returns only approved decisions",
    approvedResult.data.length,
    1,
  );
  TestValidator.equals(
    "approved decision type matches",
    approvedResult.data[0].decision_type,
    "approved",
  );
  // 8. Test: Filter by decision_type='rejected'
  const rejectedFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision_type: "rejected",
    page: 1,
    limit: 20,
  };
  const rejectedResult =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  TestValidator.equals(
    "rejected filter returns only rejected decisions",
    rejectedResult.data.length,
    1,
  );
  TestValidator.equals(
    "rejected decision type matches",
    rejectedResult.data[0].decision_type,
    "rejected",
  );
  // 9. Test: Filter by reviewer_id (super admin 1)
  const reviewer1Filter: IDiscussionBoardAdminRequestDecision.IRequest = {
    reviewer_id: decision1.reviewer.id,
    page: 1,
    limit: 20,
  };
  const reviewer1Result =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: reviewer1Filter },
    );
  typia.assert(reviewer1Result);
  TestValidator.equals(
    "reviewer_id filter returns decisions by specific reviewer",
    reviewer1Result.data.length,
    1,
  );
  TestValidator.equals(
    "reviewer id matches",
    reviewer1Result.data[0].reviewer.id,
    decision1.reviewer.id,
  );
  // 10. Test: Filter by reviewer_id (super admin 2)
  const reviewer2Filter: IDiscussionBoardAdminRequestDecision.IRequest = {
    reviewer_id: decision2.reviewer.id,
    page: 1,
    limit: 20,
  };
  const reviewer2Result =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: reviewer2Filter },
    );
  typia.assert(reviewer2Result);
  TestValidator.equals(
    "reviewer_id filter returns decisions by second reviewer",
    reviewer2Result.data.length,
    1,
  );
  TestValidator.equals(
    "reviewer id matches second reviewer",
    reviewer2Result.data[0].reviewer.id,
    decision2.reviewer.id,
  );
  // 11. Test: Filter by created_at range (include both decisions)
  const dateRangeStart = new Date(
    Math.min(
      new Date(decision1.created_at).getTime(),
      new Date(decision2.created_at).getTime(),
    ) - 60000,
  ).toISOString();
  const dateRangeEnd = new Date(
    Math.max(
      new Date(decision1.created_at).getTime(),
      new Date(decision2.created_at).getTime(),
    ) + 60000,
  ).toISOString();
  const dateRangeFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    created_at_from: dateRangeStart,
    created_at_to: dateRangeEnd,
    page: 1,
    limit: 20,
  };
  const dateRangeResult =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: dateRangeFilter },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns both decisions",
    dateRangeResult.data.length,
    2,
  );
  // 12. Test: Combine multiple filters (decision_type + reviewer_id)
  const combinedFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision_type: "approved",
    reviewer_id: decision1.reviewer.id,
    page: 1,
    limit: 20,
  };
  const combinedResult =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined filters return intersection of criteria",
    combinedResult.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter decision type matches",
    combinedResult.data[0].decision_type,
    "approved",
  );
  TestValidator.equals(
    "combined filter reviewer matches",
    combinedResult.data[0].reviewer.id,
    decision1.reviewer.id,
  );
  // 13. Test: Empty results when no decisions match filters
  const nonExistentReviewerId = typia.random<string & tags.Format<"uuid">>();
  const emptyFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    reviewer_id: nonExistentReviewerId,
    page: 1,
    limit: 20,
  };
  const emptyResult =
    await api.functional.discussionBoard.administrator.admin_requests.decisions.index(
      superAdmin1Connection,
      { body: emptyFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results when no decisions match",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records reflect empty result",
    emptyResult.pagination.records,
    0,
  );
  // 14. Test: Pagination metadata reflects filtered result count
  TestValidator.equals(
    "approved filter pagination records correct",
    approvedResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "date range filter pagination records correct",
    dateRangeResult.pagination.records,
    2,
  );
}
