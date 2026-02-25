import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies successful retrieval of an administrator grade change detail by superAdministrator.
  // 1. Authenticate as superAdministrator using the join utility function.
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers = { Authorization: superAdminAuth.token.access };
  // 2. Retrieve an existing administrator grade change record details.
  // For testing, we generate a random UUID to use as gradeChangeId because no creation API is provided in scenario.
  // This assumes that our test environment has a record with this id; if not, test environment must seed this record.
  // If realistic UUID is not guaranteed to exist, then we must adjust the scenario accordingly.
  // Generating a random UUID for test gradeChangeId
  const gradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the target endpoint to fetch the grade change detail
  const gradeChange =
    await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.at(
      superAdminConnection,
      { gradeChangeId },
    );
  // 4. Validate the response with complete type check
  typia.assert(gradeChange);
  // 5. Validate required fields
  TestValidator.predicate(
    "gradeChange id exists",
    typeof gradeChange.id === "string" && gradeChange.id.length > 0,
  );
  TestValidator.predicate(
    "gradeChange deletedAt is null",
    gradeChange.deletedAt === null,
  );
  // 6. Validate nested administrator summary
  typia.assert(gradeChange.administrator);
  TestValidator.predicate(
    "administrator id is string",
    typeof gradeChange.administrator.id === "string" &&
      gradeChange.administrator.id.length > 0,
  );
  TestValidator.predicate(
    "administrator email is string",
    typeof gradeChange.administrator.email === "string" &&
      gradeChange.administrator.email.length > 0,
  );
  TestValidator.predicate(
    "administrator deleted_at is null or string",
    gradeChange.administrator.deleted_at === null ||
      typeof gradeChange.administrator.deleted_at === "string",
  );
  // 7. Validate nested grade summary (though ISummary is empty type, just check existance)
  TestValidator.predicate(
    "grade is object",
    typeof gradeChange.grade === "object" && gradeChange.grade !== null,
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "createdAt is string",
    typeof gradeChange.createdAt === "string" &&
      gradeChange.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is string",
    typeof gradeChange.updatedAt === "string" &&
      gradeChange.updatedAt.length > 0,
  );
}
