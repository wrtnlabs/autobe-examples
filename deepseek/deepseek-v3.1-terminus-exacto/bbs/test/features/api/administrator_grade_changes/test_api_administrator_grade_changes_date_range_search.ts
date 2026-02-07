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

export async function test_api_administrator_grade_changes_date_range_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create test dates for filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Test case 1: Search for records within the past day
  const response1 =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneDayAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response1);
  // Test case 2: Search for records from two days ago to one day later
  const response2 =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: oneDayLater.toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response2);
  // Test case 3: Search with only start date (all records from one day ago onward)
  const response3 =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: oneDayAgo.toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response3);
  // Test case 4: Search with only end date (all records up to one day later)
  const response4 =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_end: oneDayLater.toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response4);
  // Test case 5: Search with pagination parameters
  const response5 =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.index(
      superAdminConnection,
      {
        body: {
          created_at_start: twoDaysAgo.toISOString(),
          created_at_end: oneDayLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response5);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has valid structure",
    typeof response1.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    response1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    response1.pagination.limit >= 0 && response1.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response1.pagination.pages >= 0,
  );
  // Validate that data is an array (typia.assert already validated the content)
  TestValidator.equals(
    "data is always an array",
    Array.isArray(response1.data),
    true,
  );
}
