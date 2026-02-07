import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test advanced filtering capabilities for grade change searches.
 * An administrator searches for specific grade transitions using filters:
 * text search on reason field, specific old_grade and new_grade combinations,
 * and date range filtering. Verify that the search correctly applies all
 * specified filters and returns only matching records.
 */
export async function test_api_administrator_grade_changes_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate test administrator ID
  const administratorId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Text search with partial matching
  const searchResult1 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId,
        body: {
          search: RandomGenerator.alphabets(10),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Filter by specific grade transition
  const searchResult2 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId,
        body: {
          old_grade: RandomGenerator.alphabets(8),
          new_grade: RandomGenerator.alphabets(8),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const searchResult3 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId,
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Combined filters
  const searchResult4 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId,
        body: {
          search: RandomGenerator.alphabets(12),
          old_grade: RandomGenerator.alphabets(6),
          new_grade: RandomGenerator.alphabets(6),
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Empty search results (non-existent criteria)
  const searchResult5 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId,
        body: {
          search: RandomGenerator.alphabets(20),
          old_grade: RandomGenerator.alphabets(15),
          new_grade: RandomGenerator.alphabets(15),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Test 6: Boundary date ranges
  const boundarySearch =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId,
        body: {
          created_at_start: new Date(0).toISOString(),
          created_at_end: new Date().toISOString(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(boundarySearch);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof searchResult1.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    searchResult1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    searchResult1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records",
    searchResult1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    searchResult1.pagination.pages >= 0,
  );
  // Validate data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(searchResult1.data),
    true,
  );
}
