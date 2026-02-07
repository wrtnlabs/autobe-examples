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
 * Test the successful retrieval of an administrator grade change record by a super administrator.
 * This scenario validates that when a super administrator provides a valid grade change ID,
 * the system returns the complete audit trail record including administrator details, old and
 * new grades, reason for change, and timestamp. The test verifies that all required fields
 * are present and properly formatted.
 */
export async function test_api_administrator_grade_change_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a valid grade change ID
  const changeId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the grade change record
  const gradeChange =
    await api.functional.discussionBoard.superAdmin.administrator_grade_changes.at(
      superAdminConnection,
      {
        changeId,
      },
    );
  // Validate the complete response structure - typia.assert performs complete validation
  typia.assert(gradeChange);
  // Verify the grade change ID matches the requested ID
  TestValidator.equals("grade change ID matches", gradeChange.id, changeId);
}
