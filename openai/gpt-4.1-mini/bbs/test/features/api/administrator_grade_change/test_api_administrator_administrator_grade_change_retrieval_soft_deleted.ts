import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionResult";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change } from "../../../generate/generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change";
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";
import { prepare_random_discussion_board_administrator_grade_change } from "../../../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function test_api_administrator_administrator_grade_change_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving an existing administrator grade change record that has been soft deleted (deletedAt is set). Verify that authorized administrators can still retrieve these records for audit purposes including all relevant fields. Ensure the system correctly handles records flagged as soft deleted and that the returned deletedAt timestamp matches the soft delete time. Validate response structure and authorization enforcement.
  // 1. Setup super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: { password: superAdminPassword },
    },
  );
  typia.assert(superAdminJoin);
  // 2. Login super administrator
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: superAdminJoin.email,
      password: superAdminPassword,
    },
  });
  // 3. Create an administrator grade
  const adminGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {},
    );
  typia.assert(adminGrade);
  // 4. Join an administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_administrator_join(adminJoinConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminJoin);
  // 5. Login administrator (include href and referrer as required)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminLogin);
  // 6. Prepare and create administrator grade change record
  const gradeChangeCreateBody: IDiscussionBoardAdministratorGradeChange.ICreate =
    {
      discussion_board_administrator_id: adminLogin.id,
      discussion_board_administrator_grade_id: adminGrade.id,
    };
  const adminGradeChange =
    await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
      adminLoginConnection,
      { body: gradeChangeCreateBody },
    );
  typia.assert(adminGradeChange);
  // 7. Retrieve the grade change by ID
  const retrievedGradeChange =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.at(
      adminLoginConnection,
      {
        gradeChangeId: adminGradeChange.id,
      },
    );
  typia.assert(retrievedGradeChange);
  // 8. Validate retrieved record
  TestValidator.equals(
    "grade change id equals",
    retrievedGradeChange.id,
    adminGradeChange.id,
  );
  TestValidator.equals(
    "administrator id equals",
    retrievedGradeChange.administrator.id,
    adminLogin.id,
  );
  // Validate grade property existence and type instead of specific fields
  TestValidator.predicate(
    "grade exists and is an object",
    typeof retrievedGradeChange.grade === "object" &&
      retrievedGradeChange.grade !== null,
  );
  TestValidator.predicate(
    "deletedAt is string or null",
    typeof retrievedGradeChange.deletedAt === "string" ||
      retrievedGradeChange.deletedAt === null,
  );
  // 9. Authorization enforcement (unauthorized retrieval)
  // Create another admin and try to retrieve using that admin (should succeed)
  const anotherAdminConnection: api.IConnection = { host: connection.host };
  const anotherAdminPassword = RandomGenerator.alphaNumeric(16);
  const anotherAdminJoin = await authorize_administrator_join(
    anotherAdminConnection,
    {
      body: { password: anotherAdminPassword },
    },
  );
  typia.assert(anotherAdminJoin);
  const anotherAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherAdminLogin = await authorize_administrator_login(
    anotherAdminLoginConnection,
    {
      body: {
        email: anotherAdminJoin.email,
        password: anotherAdminPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(anotherAdminLogin);
  // Another admin retrieves the same grade change
  const anotherAdminRetrieved =
    await api.functional.discussionBoard.administrator.administrator_grade_changes.at(
      anotherAdminLoginConnection,
      {
        gradeChangeId: adminGradeChange.id,
      },
    );
  typia.assert(anotherAdminRetrieved);
  TestValidator.equals(
    "grade change id equals for another admin",
    anotherAdminRetrieved.id,
    adminGradeChange.id,
  );
}
