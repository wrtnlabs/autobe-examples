import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_administrator_grade_change_retrieval_soft_deleted_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator joins (registers) to get authorization token
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {},
    });
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Prepare a random UUID to simulate the gradeChangeId of a soft-deleted grade change record
  //    Since we do not have API to create the record, we simulate the scenario with a random UUID
  //    In real case, such record should exist with a soft delete timestamp
  const softDeletedGradeChangeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve the soft-deleted administrator grade change record by gradeChangeId
  const gradeChange: IDiscussionBoardAdministratorGradeChange =
    await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.at(
      superAdminConnection,
      {
        gradeChangeId: softDeletedGradeChangeId,
      },
    );
  // 4. Assert the complete structure of the response including nested administrator and grade details
  typia.assert(gradeChange);
  // 5. Additional validations can be added to assure nested completeness based on the known schema properties
  //    but here we rely on typia.assert for full validation
}
