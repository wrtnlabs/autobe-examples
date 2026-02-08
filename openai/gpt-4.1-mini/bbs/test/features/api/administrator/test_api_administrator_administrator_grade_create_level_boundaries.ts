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
import { generate_random_discussion_board_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";

export async function test_api_administrator_administrator_grade_create_level_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: This scenario tests the creation of an administrator grade with the minimum and maximum allowed level values.
  // 1. Administrator user registration (join) for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminJoinOutput);
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoinOutput.token.access}`,
  };
  // Define boundary level values
  const minLevel = 1 as number;
  const maxLevel = 2147483647 as number; // Using 32-bit signed int max as high boundary
  // 2. Create administrator grade with minimum level
  const minGradeName = `min_level_grade_${RandomGenerator.alphabets(6)}`;
  const minGradeBody = {
    name: minGradeName,
    description: "Minimum level administrator grade",
    level: minLevel,
  } satisfies IDiscussionBoardAdministratorGrade.ICreate;
  const minGrade =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {
        body: minGradeBody,
      },
    );
  typia.assert(minGrade);
  // 3. Create administrator grade with maximum level
  const maxGradeName = `max_level_grade_${RandomGenerator.alphabets(6)}`;
  const maxGradeBody = {
    name: maxGradeName,
    description: "Maximum level administrator grade",
    level: maxLevel,
  } satisfies IDiscussionBoardAdministratorGrade.ICreate;
  const maxGrade =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {
        body: maxGradeBody,
      },
    );
  typia.assert(maxGrade);
  // 4. Confirm uniqueness of name enforcement
  await TestValidator.error("duplicate min grade name", async () => {
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {
        body: minGradeBody,
      },
    );
  });
  await TestValidator.error("duplicate max grade name", async () => {
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {
        body: maxGradeBody,
      },
    );
  });
}
