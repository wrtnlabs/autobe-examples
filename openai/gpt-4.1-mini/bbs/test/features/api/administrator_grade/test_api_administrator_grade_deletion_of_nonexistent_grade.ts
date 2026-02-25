import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_administrator_grade_deletion_of_nonexistent_grade(
  connection: api.IConnection,
): Promise<void> {
  // Test deletion attempt of a non-existent administrator grade by a super administrator.
  // After authenticating, issue a delete request with a gradeId that does not exist.
  // Verify that the system returns an error response indicating the grade not found and prevents deletion.
  // Confirm proper error handling and no changes to existing grades.
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Attempt to delete a non-existent gradeId
  const nonexistentGradeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent administrator grade should fail",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.grades.erase(
        superAdminConnection,
        {
          gradeId: nonexistentGradeId,
        },
      );
    },
  );
}
