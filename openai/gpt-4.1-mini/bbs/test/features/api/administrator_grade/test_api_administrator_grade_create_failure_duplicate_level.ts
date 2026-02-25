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

export async function test_api_administrator_grade_create_failure_duplicate_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare super administrator join and authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  // Use token-authenticated connection
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Create first administrator grade with random valid data
  const firstGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {},
    );
  typia.assert(firstGrade);
  // 3. Attempt to create second administrator grade with duplicate level but different name
  const duplicateLevelGradeBody: IDiscussionBoardAdministratorGrade.ICreate = {
    name: firstGrade.name + "_dup",
    description: firstGrade.description + " duplication attempt",
    level: firstGrade.level,
  };
  // 4. Expect error on unique level constraint violation
  await TestValidator.error(
    "should fail creating administrator grade with duplicate level",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.grades.create(
        superAdminConnection,
        { body: duplicateLevelGradeBody },
      );
    },
  );
}
