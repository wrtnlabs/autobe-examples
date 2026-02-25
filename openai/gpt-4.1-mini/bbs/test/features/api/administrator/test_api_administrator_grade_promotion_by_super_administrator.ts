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

/**
 * Test successful promotion of a regular administrator to super administrator grade by a super administrator.
 * Validates authorization with superAdmin token, submits valid grade update request targeting a regular admin,
 * verifies updated grade is super administrator, ensures database reflects the promotion, and that unauthorized users
 * cannot perform this operation.
 */
export async function test_api_administrator_grade_promotion_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator registration and authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {
        email: `superadmin-${typia.random<string & typia.tags.Format<"email">>()}`,
        password: "StrongPass1!",
        href: "http://localhost/join",
        referrer: "http://localhost/referrer",
        ip: null,
      },
    });
  // Update superAdminConnection headers with token for authenticated requests
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Prepare super administrator grade data for promotion
  const superGradeName = "super";
  const superGradeDescription = "Super administrator with all privileges";
  const superGradeLevel = 100;
  // 3. Perform the grade update request to promote grade globally
  const updateBody: IDiscussionBoardAdministratorGrade.IUpdate = {
    name: superGradeName,
    description: superGradeDescription,
    level: superGradeLevel,
  };
  const updatedGrade =
    await api.functional.discussionBoard.superAdministrator.administrator.grades.updateAdministratorGrades(
      superAdminConnection,
      { body: updateBody },
    );
  typia.assert(updatedGrade);
  // 4. Validate updated grade fields
  TestValidator.equals("grade name updated", updatedGrade.name, superGradeName);
  TestValidator.equals(
    "grade description updated",
    updatedGrade.description,
    superGradeDescription,
  );
  TestValidator.equals(
    "grade level updated",
    updatedGrade.level,
    superGradeLevel,
  );
  // 5. Test unauthorized update attempt with normal connection
  const normalConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized update fails",
    async () =>
      await api.functional.discussionBoard.superAdministrator.administrator.grades.updateAdministratorGrades(
        normalConnection,
        { body: updateBody },
      ),
  );
}
