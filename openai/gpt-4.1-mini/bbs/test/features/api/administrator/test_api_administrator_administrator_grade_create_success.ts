import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { generate_random_discussion_board_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_grades_create";

// Define an extended interface for the expected returned grade with extra properties
interface IDiscussionBoardAdministratorGradeResponse extends IDiscussionBoardAdministratorGrade {
  id: string;
  name: string;
  description: string;
  level: number & tags.Type<"int32"> & tags.Minimum<1>;
  created_at: string & tags.Format<"date-time">;
  updated_at: string & tags.Format<"date-time">;
}

export async function test_api_administrator_administrator_grade_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator user registration (join) to get authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // Use the authorized admin connection with JWT access token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Prepare a new administrator grade payload
  const body = {
    name: `grade_${RandomGenerator.alphabets(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    level: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardAdministratorGrade.ICreate;
  // 3. Call the API to create the administrator grade
  const createdGradeRaw =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      { body },
    );
  // Assert and cast to extended interface
  const createdGrade = typia.assert<IDiscussionBoardAdministratorGradeResponse>(createdGradeRaw);
  // 4. Validate the returned object for required fields and values
  TestValidator.predicate(
    "id exists",
    typeof createdGrade.id === "string" && createdGrade.id.length > 0,
  );
  TestValidator.equals("name matches", createdGrade.name, body.name);
  TestValidator.equals(
    "description matches",
    createdGrade.description,
    body.description,
  );
  TestValidator.equals("level matches", createdGrade.level, body.level);
  TestValidator.predicate(
    "created_at exists",
    typeof createdGrade.created_at === "string" &&
      createdGrade.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof createdGrade.updated_at === "string" &&
      createdGrade.updated_at.length > 0,
  );
  // 5. Ensure the new grade is unique by attempting to create duplicate
  await TestValidator.error("duplicate grade name", async () => {
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      { body },
    );
  });
}
