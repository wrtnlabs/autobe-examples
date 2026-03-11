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

export async function test_api_admin_request_decision_history_filter_by_super_admin_and_date(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario requires creating admin requests and having super admins
  // make decisions on them to properly test the filtering functionality.
  // However, the available API functions only include super admin authentication
  // and history retrieval, without the ability to create admin requests or decisions.
  // Since the scenario cannot be implemented with the provided API functions,
  // this test will focus on validating the filtering functionality with whatever
  // data exists in the system, testing the basic filter parameters.
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate test date ranges
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Test 1: Filter by super_admin_id with valid date range
  const validFilterRequest = {
    super_admin_id: superAdmin.id,
    created_at_start: twoWeeksAgo.toISOString(),
    created_at_end: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdminRequestDecision.IRequest;
  const validHistory =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: validFilterRequest },
    );
  typia.assert(validHistory);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination structure valid",
    validHistory.pagination.current === 1 &&
      validHistory.pagination.limit === 10 &&
      validHistory.pagination.records >= 0 &&
      validHistory.pagination.pages >= 0,
  );
  // Validate that returned decisions match the filter criteria (if any exist)
  for (const decision of validHistory.data) {
    TestValidator.equals(
      "super_admin_id matches filter",
      decision.super_admin.id,
      superAdmin.id,
    );
    const decisionDate = new Date(decision.created_at);
    TestValidator.predicate(
      "decision date within range",
      decisionDate >= twoWeeksAgo && decisionDate <= now,
    );
  }
  // Test 2: Filter with future date range (should return empty or valid data)
  const futureFilterRequest = {
    super_admin_id: superAdmin.id,
    created_at_start: now.toISOString(),
    created_at_end: oneWeekFromNow.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdminRequestDecision.IRequest;
  const futureHistory =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: futureFilterRequest },
    );
  typia.assert(futureHistory);
  // Future dates may or may not return data depending on system implementation
  // We can only validate the response structure, not the content
  TestValidator.predicate(
    "future filter response valid",
    Array.isArray(futureHistory.data) &&
      futureHistory.pagination.current === 1 &&
      futureHistory.pagination.limit === 10,
  );
  // Test 3: Filter with invalid super_admin_id
  const invalidFilterRequest = {
    super_admin_id: typia.random<string & tags.Format<"uuid">>(),
    created_at_start: twoWeeksAgo.toISOString(),
    created_at_end: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdminRequestDecision.IRequest;
  const invalidHistory =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: invalidFilterRequest },
    );
  typia.assert(invalidHistory);
  // Invalid super_admin_id should return empty results
  TestValidator.predicate(
    "invalid filter response valid",
    Array.isArray(invalidHistory.data) &&
      invalidHistory.pagination.current === 1 &&
      invalidHistory.pagination.limit === 10,
  );
  // Test 4: Filter with null super_admin_id (all super admins)
  const allAdminsFilterRequest = {
    super_admin_id: null,
    created_at_start: twoWeeksAgo.toISOString(),
    created_at_end: now.toISOString(),
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardAdminRequestDecision.IRequest;
  const allAdminsHistory =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: allAdminsFilterRequest },
    );
  typia.assert(allAdminsHistory);
  TestValidator.predicate(
    "all admins filter response valid",
    Array.isArray(allAdminsHistory.data) &&
      allAdminsHistory.pagination.current === 1 &&
      allAdminsHistory.pagination.limit === 5 &&
      allAdminsHistory.data.length <= 5,
  );
  // Test 5: Filter with decision type
  const decisionFilterRequest = {
    decision: "approved",
    super_admin_id: superAdmin.id,
    created_at_start: twoWeeksAgo.toISOString(),
    created_at_end: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardAdminRequestDecision.IRequest;
  const decisionHistory =
    await api.functional.discussionBoard.superAdmin.admin_requests.history.index(
      superAdminConnection,
      { body: decisionFilterRequest },
    );
  typia.assert(decisionHistory);
  // Validate decision filter results
  for (const decision of decisionHistory.data) {
    TestValidator.equals(
      "decision type matches filter",
      decision.decision,
      "approved",
    );
  }
}
