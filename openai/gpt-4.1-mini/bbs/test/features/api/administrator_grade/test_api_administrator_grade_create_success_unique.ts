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

export async function test_api_administrator_grade_create_success_unique(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator join for authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "Passw0rd!",
        href: "https://localhost/login",
        referrer: "https://localhost/referrer",
        ip: null,
      },
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Generate unique administrator grade
  const gradeCreateBody: IDiscussionBoardAdministratorGrade.ICreate = {
    name: `unique-grade-${typia.random<string & typia.tags.Format<"email">>().split("@")[0]}-${Date.now()}`,
    description: "A unique administrator grade for testing",
    level: 1,
  };
  const grade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: gradeCreateBody,
      },
    );
  typia.assert(grade);
  // 3. Validate the response fields
  TestValidator.predicate(
    "created id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      grade.id,
    ),
  );
  TestValidator.equals("grade name matches", grade.name, gradeCreateBody.name);
  TestValidator.equals(
    "grade description matches",
    grade.description,
    gradeCreateBody.description,
  );
  TestValidator.equals(
    "grade level matches",
    grade.level,
    gradeCreateBody.level,
  );
  TestValidator.predicate("createdAt exists", grade.created_at !== undefined);
  TestValidator.predicate("updatedAt exists", grade.updated_at !== undefined);
  // 4. Retrieve the grade again for DB consistency check
  // NOTE: Assuming there's an endpoint or SDK function to fetch administrator grades by id
  // but since not available, skipping this step
}
