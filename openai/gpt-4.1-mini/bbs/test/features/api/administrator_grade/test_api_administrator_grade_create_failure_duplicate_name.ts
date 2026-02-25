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
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";

export async function test_api_administrator_grade_create_failure_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to create two administrator grades with the same name but different levels and expects the second creation to fail due to the unique constraint on the name.
  // 1. Register and authorize super administrator
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // Create a new connection authorized as this super administrator
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdmin.token.access },
  };
  // 2. Create first administrator grade with a unique name
  const gradeName = `grade-${RandomGenerator.alphabets(8)}`;
  const firstGradeBody: IDiscussionBoardAdministratorGrade.ICreate = {
    name: gradeName,
    description: "First grade description",
    level: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() || 1,
  };
  const firstGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      authorizedConnection,
      {
        body: firstGradeBody,
      },
    );
  typia.assert(firstGrade);
  TestValidator.equals(
    "first grade name matches",
    firstGrade.name,
    firstGradeBody.name,
  );
  // 3. Attempt to create second administrator grade with the same name but different level
  const secondGradeBody: IDiscussionBoardAdministratorGrade.ICreate = {
    name: gradeName, // duplicate name
    description: "Second grade description",
    level: firstGradeBody.level + 1 || 2,
  };
  // Expect an error due to duplicate name
  await TestValidator.error("duplicate administrator grade name", async () => {
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      authorizedConnection,
      {
        body: secondGradeBody,
      },
    );
  });
}
