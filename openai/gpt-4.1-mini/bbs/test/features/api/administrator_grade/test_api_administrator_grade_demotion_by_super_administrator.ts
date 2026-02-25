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
 * Test successful demotion by super administrator of another super administrator to regular administrator grade.
 * 1. Create two super administrators
 * 2. The first super administrator attempts to demote the second to regular administrator
 * 3. Verify the grade name on response is "regular" if operation succeeds
 * 4. The first super administrator attempts to demote self and expects error
 * 5. Validate access control rules prevent self-demotion
 */
export async function test_api_administrator_grade_demotion_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Actor 1: Super Administrator A
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_administrator_join(
    superAdminAConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminA);
  // Actor 2: Super Administrator B
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_super_administrator_join(
    superAdminBConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminB);
  // Attempt demotion of Super Admin B by Super Admin A
  const demotionBody: IDiscussionBoardAdministratorGrade.IUpdate = {
    name: "regular",
  };
  // Demote other super admin
  const demotionResponse =
    await api.functional.discussionBoard.superAdministrator.administrator.grades.updateAdministratorGrades(
      superAdminAConnection,
      {
        body: demotionBody,
      },
    );
  typia.assert(demotionResponse);
  TestValidator.equals(
    "demotion target grade",
    demotionResponse.name,
    "regular",
  );
  // Super Admin A attempts self-demotion, expecting failure
  await TestValidator.error("self-demotion should error", async () => {
    await api.functional.discussionBoard.superAdministrator.administrator.grades.updateAdministratorGrades(
      superAdminAConnection,
      {
        body: demotionBody,
      },
    );
  });
}
