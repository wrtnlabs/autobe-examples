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

export async function test_api_administrator_administrator_grade_create_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IDiscussionBoardAdministrator.IJoin = {};
  const authorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create an initial administrator grade with empty body
  const firstGrade =
    await generate_random_discussion_board_administrator_administrator_grades_create(
      adminConnection,
      {},
    );
  typia.assert(firstGrade);
  // 3. Attempt to create another administrator grade with the same empty body - expect failure due to duplicate
  const duplicateBody =
    {} as unknown as DeepPartial<IDiscussionBoardAdministratorGrade.ICreate>;
  await TestValidator.error(
    "creating administrator grade with duplicate empty body should throw error",
    async () => {
      await generate_random_discussion_board_administrator_administrator_grades_create(
        adminConnection,
        {
          body: duplicateBody,
        },
      );
    },
  );
}
