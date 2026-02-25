import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_grade_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and get authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPass!234",
    },
  });
  typia.assert(adminAuthorized);
  // adminConnection.headers is updated by authorize_administrator_join
  // 2. Retrieve administrator grade details using authorized admin
  const gradeId = adminAuthorized.gradeId;
  const grade =
    await api.functional.discussionBoard.administrator.administrator.grades.atAdministratorGrade(
      adminConnection,
      { gradeId },
    );
  typia.assert(grade);
  // 3. Validate the retrieved grade corresponds to expected properties
  TestValidator.predicate(
    "grade id matches",
    typeof grade.id === "string" && grade.id.length > 0,
  );
  TestValidator.equals("grade id is same", grade.id, gradeId);
  TestValidator.predicate(
    "grade name is non-empty string",
    typeof grade.name === "string" && grade.name.length > 0,
  );
  TestValidator.predicate(
    "grade description is non-empty string",
    typeof grade.description === "string" && grade.description.length > 0,
  );
  TestValidator.predicate(
    "grade level is integer number",
    Number.isInteger(grade.level),
  );
  TestValidator.predicate(
    "grade createdAt is valid date",
    !isNaN(Date.parse(grade.created_at)),
  );
  TestValidator.predicate(
    "grade updatedAt is valid date",
    !isNaN(Date.parse(grade.updated_at)),
  );
  // deleted_at should be null or undefined, but response excludes
  TestValidator.predicate(
    "grade deleted_at is null or undefined",
    grade.deleted_at === null || grade.deleted_at === undefined,
  );
}
