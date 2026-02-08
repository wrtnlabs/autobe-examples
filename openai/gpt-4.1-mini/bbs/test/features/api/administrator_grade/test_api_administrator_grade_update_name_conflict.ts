import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";

export async function test_api_administrator_grade_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // 2. Create the first administrator grade
  const grade1 =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {},
    );
  typia.assert(grade1);
  // 3. Create the second administrator grade
  const grade2 =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {},
    );
  typia.assert(grade2);
  // 4. Attempt to update grade2's name to grade1's name, which should conflict
  await TestValidator.error(
    "update administrator grade name conflict",
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.update(
        adminConnection,
        {
          gradeId: (grade2 as any).id,
          body: {
            name: (grade1 as any).name,
          } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
        },
      );
    },
  );
}
