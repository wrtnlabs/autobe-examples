import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test retrieval of a grade change record that does not belong to the specified administrator.
 * A super administrator authenticates and attempts to retrieve a grade change record using
 * an administrator ID that does not match the actual administrator associated with the grade change.
 * The system should return an appropriate error response indicating that the grade change record
 * does not belong to the specified administrator.
 */
export async function test_api_administrator_grade_change_mismatched_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // Generate random UUIDs that don't correspond to actual records
  const mismatchedAdministratorId = typia.random<
    string & tags.Format<"uuid">
  >();
  const mismatchedGradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve grade change record with mismatched administrator ID
  await TestValidator.httpError(
    "grade change record does not belong to specified administrator",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.administrators.grade_changes.at(
        superAdminConnection,
        {
          administratorId: mismatchedAdministratorId,
          gradeChangeId: mismatchedGradeChangeId,
        },
      );
    },
  );
}
