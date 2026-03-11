import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequestDecision";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequestDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequestDecision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_decision_history_filter_by_decision_type(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authResult);
  // Test filtering by 'approved' decision type
  const approvedFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision: "approved",
    page: 1,
    limit: 10,
  };
  const approvedResponse =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResponse);
  // Validate that all returned decisions are 'approved'
  for (const decision of approvedResponse.data) {
    TestValidator.equals(
      "decision should be approved",
      decision.decision,
      "approved",
    );
  }
  // Test filtering by 'rejected' decision type
  const rejectedFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision: "rejected",
    page: 1,
    limit: 10,
  };
  const rejectedResponse =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResponse);
  // Validate that all returned decisions are 'rejected'
  for (const decision of rejectedResponse.data) {
    TestValidator.equals(
      "decision should be rejected",
      decision.decision,
      "rejected",
    );
  }
  // Test filtering with null decision (should return all decisions)
  const nullFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision: null,
    page: 1,
    limit: 10,
  };
  const nullResponse =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: nullFilter },
    );
  typia.assert(nullResponse);
  // Test filtering with undefined decision (should return all decisions)
  const undefinedFilter: IDiscussionBoardAdminRequestDecision.IRequest = {
    decision: undefined,
    page: 1,
    limit: 10,
  };
  const undefinedResponse =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: undefinedFilter },
    );
  typia.assert(undefinedResponse);
  // Validate pagination metadata reflects filtered results
  TestValidator.predicate(
    "approved response pagination current page should be 1",
    approvedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "approved response pagination limit should be 10",
    approvedResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "approved response pagination records should be non-negative",
    approvedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved response pagination pages should be non-negative",
    approvedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "rejected response pagination current page should be 1",
    rejectedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "rejected response pagination limit should be 10",
    rejectedResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "rejected response pagination records should be non-negative",
    rejectedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "rejected response pagination pages should be non-negative",
    rejectedResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "null filter response pagination current page should be 1",
    nullResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "null filter response pagination limit should be 10",
    nullResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "null filter response pagination records should be non-negative",
    nullResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "null filter response pagination pages should be non-negative",
    nullResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "undefined filter response pagination current page should be 1",
    undefinedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "undefined filter response pagination limit should be 10",
    undefinedResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "undefined filter response pagination records should be non-negative",
    undefinedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "undefined filter response pagination pages should be non-negative",
    undefinedResponse.pagination.pages >= 0,
  );
}
