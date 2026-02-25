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

export async function test_api_administrator_grade_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Prepare valid update data
  const updateBody: IDiscussionBoardAdministratorGrade.IUpdate = {
    name: `updated_grade_name_${RandomGenerator.alphabets(5)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    level: typia.random<number & tags.Type<"int32">>() satisfies number,
  };
  // 3. Use an existing gradeId (simulate or random UUID for test)
  // Here we generate a random UUID string because we have no prior environment grade IDs
  const gradeId = typia.random<string & tags.Format<"uuid">>();
  // 4. Issue PUT request with valid update data
  const updatedGrade =
    await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
      superAdminConnection,
      {
        gradeId,
        body: updateBody,
      },
    );
  typia.assert(updatedGrade);
  // 5. Validate that the response reflects the update
  TestValidator.equals(
    "grade name updated",
    updatedGrade.name,
    updateBody.name,
  );
  TestValidator.equals(
    "grade description updated",
    updatedGrade.description,
    updateBody.description,
  );
  TestValidator.equals(
    "grade level updated",
    updatedGrade.level,
    updateBody.level,
  );
  // 6. Confirm unauthorized access is forbidden
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
        unauthorizedConnection,
        {
          gradeId,
          body: updateBody,
        },
      );
    },
  );
}
