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
 * Test administrator grade changes search functionality with basic pagination.
 *
 * 1. Authenticate as an administrator
 * 2. Search grade change history for a specific administrator
 * 3. Validate pagination metadata
 * 4. Verify grade change record structure
 */
export async function test_api_administrator_grade_changes_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Search grade changes with basic pagination and search functionality
  const searchResponse =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          search: RandomGenerator.substring(
            RandomGenerator.paragraph({ sentences: 3 }),
          ),
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(searchResponse);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination object exists",
    typeof searchResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is valid",
    searchResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    searchResponse.pagination.limit > 0 &&
      searchResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "total records is non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // Validate pagination calculation consistency
  if (searchResponse.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      searchResponse.pagination.records / searchResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches records/limit",
      searchResponse.pagination.pages,
      expectedPages,
    );
  }
  // Validate data array and individual records
  TestValidator.predicate(
    "data is an array",
    Array.isArray(searchResponse.data),
  );
  // Validate each grade change record structure
  for (const gradeChange of searchResponse.data) {
    TestValidator.predicate(
      "grade change has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(gradeChange.id),
    );
    TestValidator.predicate(
      "old_grade is non-empty string",
      gradeChange.old_grade.length > 0,
    );
    TestValidator.predicate(
      "new_grade is non-empty string",
      gradeChange.new_grade.length > 0,
    );
    TestValidator.predicate(
      "reason is a string",
      typeof gradeChange.reason === "string",
    );
    TestValidator.predicate(
      "created_at is valid ISO date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(gradeChange.created_at),
    );
    // Validate administrator summary structure
    TestValidator.predicate(
      "administrator has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(gradeChange.administrator.id),
    );
    // Validate changedByAdministrator summary structure
    TestValidator.predicate(
      "changedByAdministrator has valid UUID id",
      /^[0-9a-f-]{36}$/i.test(gradeChange.changedByAdministrator.id),
    );
  }
}
