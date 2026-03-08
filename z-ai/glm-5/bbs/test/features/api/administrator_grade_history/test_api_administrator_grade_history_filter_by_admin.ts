import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a super administrator can filter grade change history by target administrator ID.
 *
 * **Setup:**
 * 1. Create a super administrator account (grade='super')
 * 2. Create two additional regular administrators
 * 3. Promote one of the regular admins to create a history record tied to that specific admin
 *
 * **Test Steps:**
 * 1. Authenticate as super administrator
 * 2. Call the endpoint with admin_id filter set to the promoted administrator's UUID
 * 3. Verify all returned history records have:
 *    - admin.id matching the specified admin_id
 *    - admin object containing correct email and displayName
 * 4. Verify no records for other administrators are included
 * 5. Call with acted_by filter set to the super admin's UUID
 * 6. Verify all returned records have actor.id matching the super admin who performed the action
 * 7. Combine filters (admin_id + action) and verify both conditions are applied correctly
 *
 * **Business Rules Validated:**
 * - admin_id filter correctly returns history for specific administrator
 * - acted_by filter correctly returns history performed by specific super admin
 * - Each history record includes complete admin and actor information
 * - Multiple filters can be combined (AND logic)
 * - Pagination works correctly with filters applied
 */
export async function test_api_administrator_grade_history_filter_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the first admin (will act as super admin for this test)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdminAuth);
  // 2. Create two more regular administrators for testing
  const regularAdmin1Connection: api.IConnection = { host: connection.host };
  const regularAdmin1Auth = await authorize_admin_join(
    regularAdmin1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdmin1Auth);
  const regularAdmin2Connection: api.IConnection = { host: connection.host };
  const regularAdmin2Auth = await authorize_admin_join(
    regularAdmin2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(regularAdmin2Auth);
  // 3. Promote regularAdmin1 to create a grade change history record
  const promotedAdmin =
    await api.functional.discussionBoard.admin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdmin1Auth.id,
        body: {
          reason: "Test promotion for grade history filtering",
        } satisfies IDiscussionBoardAdmin.IPromote,
      },
    );
  typia.assert(promotedAdmin);
  // 4. Test filtering by admin_id
  const historyByAdminId =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          admin_id: regularAdmin1Auth.id,
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(historyByAdminId);
  // Verify all returned history records have admin.id matching the specified admin_id
  TestValidator.predicate(
    "all history records have correct admin.id when filtering by admin_id",
    historyByAdminId.data.every(
      (record) => record.admin.id === regularAdmin1Auth.id,
    ),
  );
  // Verify admin object contains correct email and displayName
  TestValidator.predicate(
    "admin object has correct email and displayName",
    historyByAdminId.data.every(
      (record) =>
        record.admin.email === regularAdmin1Auth.email &&
        record.admin.displayName === regularAdmin1Auth.displayName,
    ),
  );
  // 5. Test filtering by acted_by (the super admin who performed the action)
  const historyByActor =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          acted_by: superAdminAuth.id,
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(historyByActor);
  // Verify all returned records have actor.id matching the super admin
  TestValidator.predicate(
    "all history records have correct actor.id when filtering by acted_by",
    historyByActor.data.every(
      (record) => record.actor.id === superAdminAuth.id,
    ),
  );
  // Verify actor object contains correct email and displayName
  TestValidator.predicate(
    "actor object has correct email and displayName",
    historyByActor.data.every(
      (record) =>
        record.actor.email === superAdminAuth.email &&
        record.actor.displayName === superAdminAuth.displayName,
    ),
  );
  // 6. Verify no records for regularAdmin2 are included when filtering by regularAdmin1
  const historyForRegularAdmin2 =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          admin_id: regularAdmin2Auth.id,
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(historyForRegularAdmin2);
  // Admin2 was never promoted, so should have no history records
  TestValidator.equals(
    "regularAdmin2 has no grade history records",
    historyForRegularAdmin2.data.length,
    0,
  );
  // 7. Test combined filters (admin_id + action)
  const historyWithCombinedFilters =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          admin_id: regularAdmin1Auth.id,
          action: "promotion",
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(historyWithCombinedFilters);
  // Verify both conditions are applied correctly (AND logic)
  TestValidator.predicate(
    "combined filters - all records have correct admin.id AND action",
    historyWithCombinedFilters.data.every(
      (record) =>
        record.admin.id === regularAdmin1Auth.id &&
        record.action === "promotion",
    ),
  );
  // 8. Verify pagination works with filters
  const historyWithPagination =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {
          admin_id: regularAdmin1Auth.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(historyWithPagination);
  // Verify pagination info is present
  TestValidator.predicate(
    "pagination info exists",
    historyWithPagination.pagination.current === 1 &&
      historyWithPagination.pagination.limit === 10,
  );
  // Verify all paginated results still have correct admin.id
  TestValidator.predicate(
    "paginated results have correct admin.id",
    historyWithPagination.data.every(
      (record) => record.admin.id === regularAdmin1Auth.id,
    ),
  );
}
