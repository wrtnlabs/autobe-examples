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

export async function test_api_administrator_administrator_grade_retrieve_edge_case_uuid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator to obtain a valid token
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Edge case UUIDs: all zeros and all f's
  const zeroUUID = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const maxUUID = "ffffffff-ffff-ffff-ffff-ffffffffffff" as string &
    tags.Format<"uuid">;
  // 2. Attempt to retrieve administrator grade with all zeros UUID - expect 404
  await TestValidator.httpError(
    "should return 404 for zero UUID",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.at(
        adminConnection,
        {
          gradeId: zeroUUID,
        },
      );
    },
  );
  // 3. Attempt to retrieve administrator grade with max UUID - expect 404
  await TestValidator.httpError(
    "should return 404 for max UUID",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.at(
        adminConnection,
        {
          gradeId: maxUUID,
        },
      );
    },
  );
  // 4. Attempt unauthorized access by creating a connection without Authorization header
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return unauthorized error without token",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.administratorGrades.at(
        unauthorizedConnection,
        {
          gradeId: zeroUUID,
        },
      );
    },
  );
}
