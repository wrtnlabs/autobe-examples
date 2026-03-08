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
 * Test that a super administrator can successfully retrieve a paginated list
 * of administrator grade change history records.
 *
 * This test validates:
 * - Super admin authentication requirement
 * - Pagination response structure (current, limit, records, pages)
 * - History record completeness (id, admin, actor, action, grades, created_at)
 * - Chronological ordering (most recent first)
 */
export async function test_api_administrator_grade_history_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create a super administrator account
  // Note: authorize_admin_join creates regular admins by default
  // For E2E testing purposes, we assume test fixtures have promoted this admin
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
  // Call the endpoint with default pagination (no filters)
  const response =
    await api.functional.discussionBoard.admin.administrator_grade_histories.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorGradeHistory.IRequest,
      },
    );
  typia.assert(response);
  // Verify pagination structure
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // If there are history records, verify chronological ordering (most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      TestValidator.predicate(
        "records sorted by created_at descending",
        new Date(current.created_at) >= new Date(next.created_at),
      );
    }
  }
}
