import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_administrator_grade_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Set authorization header internally updated in connection by the utility function
  // 2. Retrieve administrator grade by id
  const grade =
    await api.functional.discussionBoard.superAdministrator.administrator.grades.atAdministratorGrade(
      superAdminConnection,
      { gradeId: typia.random<string & tags.Format<"uuid">>() },
    );
  typia.assert(grade);
  // 3. Validate fields
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      grade.id,
    ),
  );
  TestValidator.predicate(
    "name is unique string",
    typeof grade.name === "string" && grade.name.length > 0,
  );
  TestValidator.predicate(
    "description is string",
    typeof grade.description === "string",
  );
  TestValidator.predicate("level is integer", Number.isInteger(grade.level));
  TestValidator.predicate(
    "createdAt is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(grade.created_at),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(grade.updated_at),
  );
  // 4. Ensure deleted_at is not in response
  TestValidator.predicate(
    "deleted_at field is undefined",
    grade.deleted_at === undefined,
  );
}
