import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrator grade changes by specific grade transitions.
 * The super administrator should be able to filter records by old_grade and new_grade
 * parameters to track specific promotion or demotion patterns.
 */
export async function test_api_administrator_grade_changes_grade_transition_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test filtering by regular to super transition
  const regularToSuperResponse =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          old_grade: "regular",
          new_grade: "super",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(regularToSuperResponse);
  // Test filtering by super to regular transition
  const superToRegularResponse =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          old_grade: "super",
          new_grade: "regular",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(superToRegularResponse);
  // Validate that filtered results contain only matching transitions
  for (const record of regularToSuperResponse.data) {
    TestValidator.equals(
      "old_grade should be regular",
      record.old_grade,
      "regular",
    );
    TestValidator.equals(
      "new_grade should be super",
      record.new_grade,
      "super",
    );
  }
  for (const record of superToRegularResponse.data) {
    TestValidator.equals(
      "old_grade should be super",
      record.old_grade,
      "super",
    );
    TestValidator.equals(
      "new_grade should be regular",
      record.new_grade,
      "regular",
    );
  }
  // Test pagination works correctly
  TestValidator.predicate(
    "pagination should have current page",
    regularToSuperResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination should have limit",
    regularToSuperResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination should have records count",
    regularToSuperResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    regularToSuperResponse.pagination.pages >= 0,
  );
  // Test empty filter (should return all records)
  const allRecordsResponse =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(allRecordsResponse);
  // Validate response structure for all records
  TestValidator.predicate(
    "response should have pagination",
    allRecordsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(allRecordsResponse.data),
  );
}
