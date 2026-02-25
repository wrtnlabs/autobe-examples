import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change } from "../../../generate/generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change";
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";
import { prepare_random_discussion_board_administrator_grade_change } from "../../../prepare/prepare_random_discussion_board_administrator_grade_change";

export async function test_api_administrator_grade_update_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * This test covers administrator grade update scenarios by a super administrator.
   * It includes:
   * 1. Creating super administrator and regular administrator accounts
   * 2. Creating administrator grades for 'regular' and 'super'
   * 3. Promoting a regular administrator to super administrator
   * 4. Demoting a super administrator to regular administrator by another super administrator
   * 5. Attempting self-demotion by a super administrator which should fail
   * 6. Assertions are real-time using typia.assert and TestValidator
   */
  // Prepare connections for actors
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminLoginConnection: api.IConnection = { host: connection.host };
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminLoginConnection: api.IConnection = { host: connection.host };
  // 1. Super administrator join and login
  const superAdminJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPass123!",
    href: "http://localhost/join",
    referrer: "http://localhost/referrer",
    ip: null,
  };
  const superAdminJoined = await authorize_super_administrator_join(
    superAdminJoinConnection,
    {
      body: superAdminJoinPayload,
    },
  );
  typia.assert(superAdminJoined);
  superAdminLoginConnection.headers = {
    Authorization: superAdminJoined.token.access,
  };
  // 2. Administrator join and login
  const adminJoinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass123!",
  };
  const adminJoined = await authorize_administrator_join(adminJoinConnection, {
    body: adminJoinPayload,
  });
  typia.assert(adminJoined);
  // Login administrator
  const adminLoggedIn = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: adminJoinPayload.email,
        password: adminJoinPayload.password,
        href: "http://localhost/login",
        referrer: "http://localhost/referrer",
        ip: null,
      },
    },
  );
  typia.assert(adminLoggedIn);
  adminLoginConnection.headers = { Authorization: adminLoggedIn.token.access };
  // 3. Create administrator grades: "regular" and "super" by super administrator
  const regularGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminLoginConnection,
      {
        body: {
          name: "regular",
          description: "Regular administrator",
          level: 1,
        },
      },
    );
  typia.assert(regularGrade);
  const superGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminLoginConnection,
      {
        body: {
          name: "super",
          description: "Super administrator with full permissions",
          level: 10,
        },
      },
    );
  typia.assert(superGrade);
  // 4. Promote regular administrator to super administrator
  //    by super administrator
  const promotedGrade =
    await api.functional.discussionBoard.administrator.administrator.grades.updateAdministratorGrades(
      adminLoginConnection,
      {
        body: {
          name: "super",
          description: "Promoted to super administrator",
          level: 10,
        } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
      },
    );
  typia.assert(promotedGrade);
  TestValidator.equals(
    "administrator grade is super after promotion",
    promotedGrade.name,
    "super",
  );
  // Record the grade change
  await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
    superAdminLoginConnection,
    {
      body: {
        discussion_board_administrator_id: adminLoggedIn.id,
        discussion_board_administrator_grade_id: superGrade.id,
      },
    },
  );
  // 5. Super administrator demotes other super administrator to regular
  // Need to prepare second super administrator to perform demotion
  const superAdmin2JoinConnection: api.IConnection = { host: connection.host };
  const superAdmin2LoginConnection: api.IConnection = { host: connection.host };
  const superAdmin2Joined = await authorize_super_administrator_join(
    superAdmin2JoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPass456!",
        href: "http://localhost/join2",
        referrer: "http://localhost/referrer2",
        ip: null,
      },
    },
  );
  typia.assert(superAdmin2Joined);
  superAdmin2LoginConnection.headers = {
    Authorization: superAdmin2Joined.token.access,
  };
  // Using superAdmin2 to demote superAdmin1 (previous admin login connection)
  const demotedGrade =
    await api.functional.discussionBoard.administrator.administrator.grades.updateAdministratorGrades(
      superAdmin2LoginConnection,
      {
        body: {
          name: "regular",
          description: "Demoted to regular administrator",
          level: 1,
        } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
      },
    );
  typia.assert(demotedGrade);
  TestValidator.equals(
    "administrator grade is regular after demotion",
    demotedGrade.name,
    "regular",
  );
  // Record the grade change for demotion
  await generate_random_discussion_board_administrator_administrator_grade_changes_create_administrator_grade_change(
    superAdmin2LoginConnection,
    {
      body: {
        discussion_board_administrator_id: adminLoggedIn.id,
        discussion_board_administrator_grade_id: regularGrade.id,
      },
    },
  );
  // 6. Attempt self-demotion by super administrator (should fail)
  // Re-login superAdmin2 to use updated connection
  const superAdmin2Relogin = await authorize_super_administrator_login(
    superAdmin2LoginConnection,
    {
      body: {
        email: superAdmin2Joined.email,
        password: "StrongPass456!",
      },
    },
  );
  typia.assert(superAdmin2Relogin);
  superAdmin2LoginConnection.headers = {
    Authorization: superAdmin2Relogin.token.access,
  };
  // Attempt self-demotion (demote self to regular) by superAdmin2
  await TestValidator.error(
    "super administrator cannot self-demote",
    async () => {
      await api.functional.discussionBoard.administrator.administrator.grades.updateAdministratorGrades(
        superAdmin2LoginConnection,
        {
          body: {
            name: "regular",
            description: "Attempt self-demotion",
            level: 1,
          } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
        },
      );
    },
  );
}
