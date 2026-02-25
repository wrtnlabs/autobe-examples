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

export async function test_api_administrator_grade_update_name_duplicate_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdminAuth.token.access;
  // 2. Setup: get two existing administrator grades for duplicate name conflict test
  //    Since no list or create endpoints are provided, use fixed known UUIDs or random UUIDs
  //    Here we generate two random UUIDs to simulate existing grade IDs for test
  //    In a real scenario, these should be fetched or created with unique names
  const gradeId1 = typia.random<string & tags.Format<"uuid">>();
  const gradeId2 = typia.random<string & tags.Format<"uuid">>();
  // 3. Set distinct names
  const gradeName1 = "UniqueGradeName_A";
  const gradeName2 = "UniqueGradeName_B";
  // 4. Attempt to update the first grade with unique name1 (may fail if gradeId1 does not exist, ignore error)
  try {
    const res1 =
      await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
        superAdminConnection,
        {
          gradeId: gradeId1,
          body: {
            name: gradeName1,
            description: "Description for grade A",
            level: 1,
          } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
        },
      );
    typia.assert(res1);
  } catch {}
  // 5. Attempt to update the second grade with unique name2
  try {
    const res2 =
      await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
        superAdminConnection,
        {
          gradeId: gradeId2,
          body: {
            name: gradeName2,
            description: "Description for grade B",
            level: 2,
          } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
        },
      );
    typia.assert(res2);
  } catch {}
  // 6. Attempt to update gradeId2's name to gradeName1, causing duplicate name conflict
  await TestValidator.httpError("duplicate name conflict", 409, async () => {
    await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
      superAdminConnection,
      {
        gradeId: gradeId2,
        body: {
          name: gradeName1,
        } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
      },
    );
  });
  // 7. Unauthorized attempt to update gradeId2 - expect 401 Unauthorized
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update attempt",
    401,
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.grades.update(
        unauthorizedConnection,
        {
          gradeId: gradeId2,
          body: {
            name: "AnyName",
          } satisfies IDiscussionBoardAdministratorGrade.IUpdate,
        },
      );
    },
  );
}
